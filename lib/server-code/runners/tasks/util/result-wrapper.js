'use strict'

const argsUtil = require('./args')

/**
 * @typedef {Object} ExceptionWrapper
 * @property {String} ___jsonclass
 * @property {Number} code
 * @property {Number} httpStatusCode
 * @property {String} exceptionClass
 * @property {String} exceptionMessage
 */

/**
 * @param {String} requestId
 * @param {?Error|ExceptionWrapper|String} err
 * @param {*} args
 * @returns {Object}
 */
exports.invocationResult = function(requestId, err, args) {
  return {
    ___jsonclass: 'com.backendless.coderunner.commons.protocol.InvocationResult',
    requestId,
    arguments   : args !== undefined ? argsUtil.encode(args) : [],
    exception   : err && exports.exception(err)
  }
}

/**
 * @param {?Error|ExceptionWrapper|String} err
 * @returns {Object}
 */
exports.exception = function(err) {
  const errCode = typeof err.code === 'number' ? err.code : 0
  const httpStatusCode = typeof err.httpStatusCode === 'number' ? err.httpStatusCode : -1

  let message = err.exceptionMessage || err.message || err

  if (typeof message !== 'string') {
    message = JSON.stringify(message)
  }

  return {
    ___jsonclass    : err.___jsonclass || 'com.backendless.commons.exception.ExceptionWrapper',
    code            : errCode,
    httpStatusCode  : httpStatusCode,
    exceptionClass  : err.exceptionClass || 'java.lang.Exception',
    exceptionMessage: message
  }
}

/**
 * @param {?Error|ExceptionWrapper|String} err
 * @param {?*=} result
 * @returns {Object}
 */
exports.executionResult = function(err, result) {
  return {
    ___jsonclass: 'com.backendless.servercode.ExecutionResult',
    result      : result,
    exception   : err && exports.exception(err)
  }
}