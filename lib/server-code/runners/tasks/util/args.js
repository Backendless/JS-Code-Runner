'use strict'

const Backendless = require('backendless'),
      json        = require('../../../../util/json')

const defaultClassMappings = {
  [Backendless.User.prototype.___class]     : Backendless.User,
}

/**
 * UTF8 Bytes Array -> JSON -> Array of objects classified according to classMappings
 *
 * @param {Array<number>} args
 * @param {Object<String, Function>=} classMappings
 * @returns {Array<*>}
 */
exports.decode = function(args, classMappings) {
  classMappings = Object.assign({}, defaultClassMappings, classMappings)

  return (args && args.length)
    ? json.parse(Buffer.from(args).toString(), classMappings)
    : []
}

/**
 * Array of objects -> JSON -> UTF8 Bytes Array
 *
 * @param {*} args
 * @returns {Array<number>}
 */
exports.encode = function(args) {
  return Buffer.from(json.stringify(args)).toJSON().data
}
