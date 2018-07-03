'use strict'

const Backendless = require('backendless'),
      json        = require('../../../../util/json')

const defaultClassMappings = {
  [Backendless.User.prototype.___class] : Backendless.User,
  ['com.backendless.geo.model.GeoPoint']: Backendless.GeoPoint,
  ['GeoPoint']                          : Backendless.GeoPoint
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
    ? json.parse(new Buffer(args).toString(), classMappings)
    : []
}

/**
 * Array of objects -> JSON -> UTF8 Bytes Array
 *
 * @param {*} args
 * @returns {Array<number>}
 */
exports.encode = function(args) {
  return new Buffer(json.stringify(args)).toJSON().data
}