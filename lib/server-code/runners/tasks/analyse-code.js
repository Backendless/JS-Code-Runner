'use strict'

const ServerCodeModel = require('../../model'),
      logger          = require('../../../util/logger')

/**
 * @param {InvokeActionTask} task
 * @returns {ServerCodeModel}
 */
function analyseServerCode(task) {
  logger.info(`[ANALYSE CODE] codePath: ${task.codePath}`)

  return ServerCodeModel.build(task.codePath)
}

module.exports = analyseServerCode