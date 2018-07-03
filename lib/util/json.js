'use strict'

const OBJECTREF_FIELD = '___objectref'
const DATES_FIELD = '___dates___'

/**
 * Converts a JavaScript value to a JSON string, replacing circular and repeated structures by
 * the ___objectref dummy's containing object's id which equals to object serialize order
 *
 * @param {Object} value
 * @param {String|Number} space A String or Number object that's used to insert white space into the output
 *                        JSON string for readability purposes
 * @returns {String}
 */
exports.stringify = function(value, space) {
  const seen = []

  return JSON.stringify(value, (k, v) => {
    if (v) {
      if (typeof v === 'object' && k !== DATES_FIELD) {

        //resolve dates
        for (const prop in v) {
          if (v[prop] instanceof Date) {
            v[prop] = v[prop].getTime().toString()
            v[DATES_FIELD] = v[DATES_FIELD] || []

            if (v[DATES_FIELD].indexOf(v[prop]) === -1) {
              v[DATES_FIELD].push(v[prop])
            }
          }
        }

        const seenIndex = seen.indexOf(v)

        if (seenIndex !== -1) {
          v = { [OBJECTREF_FIELD]: seenIndex }
        } else {
          seen.push(v)
        }
      }
    }

    return v
  }, space)
}

/**
 * Parses a string as JSON, using native {@link JSON.parse} function,
 * transforming object classes according to classMappings parameter
 * and resolving object references placed there by {@link json.stringify} or webORB serializer
 *
 * @param {String} text The string to parse as JSON
 * @param {Object.<String, Function>=} classMappings
 * @returns {Object}
 */
exports.parse = function(text, classMappings) {
  classMappings = classMappings || {}

  /**
   * A JSON.parse reviver which transforms object class to the mapped one
   *
   * @param {String} key
   * @param {*} value
   * @returns {*}
   */
  function classTransformReviver(key, value) {
    if (value && typeof value === 'object' && value.___class && classMappings[value.___class]) {
      value = Object.assign(new classMappings[value.___class](), value)
    }

    return value
  }

  let datesHolders = []
  let dates

  /**
   * A JSON.parse reviver which resolves encoded dates. Based on ___dates___ meta field
   * @param {String} key
   * @param {*} value
   * @returns {*}
   */
  function datesTransformReviver(key, value) {

    if (key === DATES_FIELD) {
      dates = value
      return null
    }

    if (value && typeof value === 'object' && value.hasOwnProperty(DATES_FIELD)) {
      for (const prop in value) {
        if (value.hasOwnProperty(prop) && dates.indexOf(value[prop]) !== -1) {
          value[prop] = new Date(Number.parseInt(value[prop]))
        }
      }

      datesHolders.push(value)
      dates = undefined
    }

    if (key === '') { //root object
      datesHolders.forEach(datesHolder => {
        delete datesHolder[DATES_FIELD]
      })

      datesHolders = []
    }

    return value
  }

  /**
   * An array of object references discovered during JSON parsing. Used by {@link objectRefsReviver}
   * @typedef {{parent:Object, key:String, id:Number}} ObjectReference
   *
   * @type {Array.<ObjectReference>}
   */
  const refs = []

  /**
   * @typedef {Array.<Object>} Chain
   * @type {Array.<Chain>}
   */
  const chains = []

  /**
   * A JSON.parse reviver which transform object references encoded by {json.stringify} or webORB serializer
   *
   * JSON.parse invokes the reviver beginning with the most nested properties
   * and proceeding to the original value itself.
   *
   * ___objectrefs order is the order in which objects were serialized beginning from the container and proceeding
   * to its nested properties
   *
   * That's why we need to perform a two stages transformation
   *
   * In the first stage we builds a chain of objects in an order they were serialized.
   * Additionally we accumulate all found object references for their quick replacements on second stage
   *
   * In the second stage (at the end of json processing), we replace object references found in the whole object tree
   * by real objects using the chain information gathered during the first step
   *
   * @param {String} key
   * @param {Function} value
   * @returns {*}
   */
  function objectRefsReviver(key, value) {
    if (value && typeof value === 'object') {
      const chain = [{ key, value }]

      //First stage
      while (chains.length) {
        const prevChain = chains[chains.length - 1]
        const prevChainHead = prevChain[0]

        if (value[prevChainHead.key] === prevChainHead.value) {// current object is a parent for {prevChain}
          const refId = prevChainHead.value[OBJECTREF_FIELD]

          if (refId != null) { //last chain head is an object reference
            refs.push({ parent: value, key: prevChainHead.key, id: refId })
          } else {
            //merge child chain with parent pulling down previously merge siblings
            chain.splice.apply(chain, [1, 0].concat(prevChain))
          }

          chains.pop() //remove processed chain
        } else {

          //no parents -> stop chains iteration and go to the next object
          break
        }
      }

      chains.push(chain)

      if (key === '') { //root object

        // Second stage
        // We have reached the top most value. At this point the chains array contains just
        // a single root chain, merged with all its children
        // We are ready to replace object references
        refs.forEach(ref => {
          ref.parent[ref.key] = chains[0][ref.id].value
        })
      }
    }

    return value
  }

  const mergeRevivers = (first, second) => (key, value) => second(key, first(key, value))

  let reviver = classTransformReviver

  if (text.includes(DATES_FIELD)) {
    reviver = mergeRevivers(reviver, datesTransformReviver)
  }

  if (text.includes(OBJECTREF_FIELD)) {
    reviver = mergeRevivers(reviver, objectRefsReviver)
  }

  return JSON.parse(text, reviver)
}