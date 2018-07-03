'use strict'

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent version that returns a promise.
 * An analogue to the Q.denodeify
 *
 * @param {function} fn
 * @param {Object=} context
 *
 * @returns {function}
 */
exports.promisifyNode = function(fn, context) {
  return function() {
    const args = Array.prototype.slice.call(arguments)

    return new Promise((resolve, reject) => {
      args.push((err, value) => err ? reject(err) : resolve(value))

      fn.apply(context || this, args)
    })
  }
}

exports.promisifyNodeAll = function(obj, keys) {
  keys = keys || Object.keys(obj)
  
  keys.forEach(key => {
    if (typeof obj[key] === 'function') {
      obj[key] = exports.promisifyNode(obj[key])
    }
  })
  
  return obj
}

exports.promiseWhile = function(predicate, action) {
  function loop() {
    return predicate() && Promise.resolve(action()).then(loop)
  }

  return Promise.resolve().then(loop)
}

exports.wait = function(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

class TimeoutError extends Error {
}

exports.timeoutRejector = function(ms, msg) {
  msg = msg || `Timeout after ${ms} ms`

  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new TimeoutError(msg)), ms)
  })
}

exports.timeoutRejector.Error = TimeoutError