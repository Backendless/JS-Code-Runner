'use strict'

const actions = {
  ANALYSE_SERVER_CODE : './analyse-code',
  SHUTDOWN            : './shutdown'
}

/**
 * @typedef {CodeRunnerTask} InvokeActionTask
 * @property {String} actionType
 * @property {Object} argObject
 */

/**
 * @param {InvokeActionTask} task
 * @returns {*} Task Execution Result
 */
module.exports = function(task) {
  const action = actions[task.actionType]

  if (!action) {
    throw new Error(`Unknown action type: [${task.actionType}]`)
  }

  return require(action)(task)
}