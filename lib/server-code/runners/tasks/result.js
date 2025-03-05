'use strict'

const wrapper = require('./util/result-wrapper')
const logger = require('../../../util/logger')
const timeoutRejector = require('../../../util/promise').timeoutRejector

/**
 * @param {CodeRunnerTask} task
 * @param {?Error|ExceptionWrapper|String=} error
 * @param {?*} result
 * @returns {Object} task invocation result in JSON
 */
exports.wrapResult = function wrapResult(task, error, result) {
  if (error) {
    const message = error instanceof timeoutRejector.Error
      ? error.message
      : error.stack || `Error: ${ error.message || error }`

    logger.error(message)
  }

  return wrapper.invocationResult(task.id, task.invocationContextDto, error, result)
}
