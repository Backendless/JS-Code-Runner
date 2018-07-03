'use strict'

require('backendless').ServerCode = require('./server-code/api')

exports.debug = function(opts) {
  return require('./server-code/runners/debug')(opts)
}

exports.pro = function(opts) {
  return require('./server-code/runners/pro')(opts)
}

exports.cloud = function(opts) {
  return require('./server-code/runners/cloud')(opts)
}

exports.deploy = function(opts) {
  return require('./server-code/publisher')(opts)
}