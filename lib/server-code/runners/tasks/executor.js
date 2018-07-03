'use strict'

const wrapper         = require('./util/result-wrapper'),
      logger          = require('../../../util/logger'),
      timeoutRejector = require('../../../util/promise').timeoutRejector,
      Backendless     = require('backendless'),
      path            = require('path')

const SHUTDOWN_CODE = 32768
const SHUTDOWN_ACTION = 'SHUTDOWN'

const Modes = {
  PRODUCTION : 'PRODUCTION',
  MARKETPLACE: 'MARKETPLACE',
  DEBUG      : 'DEBUG'
}

/**
 * @typedef {Object} InitAppData
 * @property {string} secretKey
 * @property {string} url
 */

/**
 * @typedef {Object} CodeRunnerTask
 * @property {String} id
 * @property {String} ___jsonclass
 * @property {String} applicationId;
 * @property {InitAppData} initAppData;
 * @property {Number} timeout
 * @property {String} relativePath
 * @property {String} codePath
 * @property {String} mode
 */

const executor = module.exports = {}

executor.RMI = 'com.backendless.coderunner.commons.protocol.RequestMethodInvocation'
executor.RAI = 'com.backendless.coderunner.commons.protocol.RequestActionInvocation'
executor.RSI = 'com.backendless.coderunner.commons.protocol.RequestServiceInvocation'

const executors = {
  [executor.RMI]: './invoke-handler',
  [executor.RAI]: './invoke-action',
  [executor.RSI]: './invoke-service'
}

/**
 * @param {CodeRunnerTask} task
 * @returns {Function} task executor
 */
function getTaskExecutor(task) {
  const taskClass = task.___jsonclass

  if (!executors[taskClass]) {
    throw new Error(`Unknown task [${taskClass}]`)
  }

  return require(executors[taskClass])
}

function executeTask(task, model) {
  const taskExecutor = getTaskExecutor(task)

  if (task.timeout < 0) {
    return taskExecutor(task, model)
  }

  return Promise.race([
    taskExecutor(task, model),
    timeoutRejector(task.timeout, 'Task execution is aborted due to timeout')
  ])
}

/**
 * @param {CodeRunnerTask} task
 */
function initClientSdk(task) {
  if (task.initAppData) {
    Backendless.serverURL = task.initAppData.url
    Backendless.initApp(task.applicationId, task.initAppData.secretKey)
  }
}

/**
 * @param {CodeRunnerTask} task
 * @param {Object} opts
 */
function enrichTask(task, opts) {
  task.codePath = path.resolve(opts.backendless.repoPath, task.applicationId.toLowerCase(), task.relativePath || '')

  //TODO: workaround for http://bugs.backendless.com/browse/BKNDLSS-12041
  if (task.___jsonclass === executor.RMI && task.eventId === SHUTDOWN_CODE) {
    task.___jsonclass = executor.RAI
    task.actionType = SHUTDOWN_ACTION
  }
}

/**
 * @param {CodeRunnerTask} task
 * @param {?Error|ExceptionWrapper|String=} error
 * @param {?*} result
 * @returns {String} task invocation result in JSON
 */
function wrapResult(task, error, result) {
  if (error) {
    const message = error instanceof timeoutRejector.Error
      ? error.message
      : error.stack || `Error: ${error.message || error}`

    logger.error(message)
  }

  return JSON.stringify(wrapper.invocationResult(task.id, error, result))
}

/**
 * @param {CodeRunnerTask} task
 * @param {Object} opts
 */
const applySandbox = (task, opts) => {
  const sandboxRequired = opts.sandbox && task.mode !== Modes.MARKETPLACE

  if (sandboxRequired) {
    const appUid = task.applicationId.replace(/-/g, '').toLowerCase()

    try {
      process.setuid(appUid)
    } catch (e) {
      if (logger.verbose) {
        logger.error(e.message)
      }

      throw new Error('Internal error. Unable to run server code in sandbox.')
    }
  }
}

/**
 * @param {CodeRunnerTask} task
 * @param {Object} opts
 * @param {ServerCodeModel=} model
 * @returns {Promise.<?string>} task invocation result in JSON (if any)
 */
executor.execute = async function(task, opts, model) {
  let response = null

  try {
    await enrichTask(task, opts)
    await initClientSdk(task)
    await applySandbox(task, opts)

    response = await executeTask(task, model)

    if (response !== undefined) {
      response = wrapResult(task, null, response)
    }

  } catch (error) {
    response = wrapResult(task, error)
  }

  if (logger.verbose) {
    logger.debug('[TRACE.REQUEST]:', JSON.stringify(task))
    logger.debug('[TRACE.RESPONSE]:', response)
  }

  return response
}

