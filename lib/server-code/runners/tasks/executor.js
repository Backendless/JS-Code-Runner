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

const CACHEABLE_EXECUTORS = [
  executor.RMI,
  executor.RSI,
]

executor.isTaskCacheable = task => {
  return CACHEABLE_EXECUTORS.includes(task.___jsonclass)
}

/**
 * @param {CodeRunnerTask} task
 * @returns {Function} task executor
 */
function getTaskExecutor(task) {
  const taskClass = task.___jsonclass

  if (!executors[taskClass]) {
    throw new Error(`Unknown task [${ taskClass }]`)
  }

  return require(executors[taskClass])
}

function executeTask(task, model) {
  const taskExecutor = getTaskExecutor(task)

  if (task.timeout < 0) {
    return taskExecutor(task, model)
  }

  const timeoutPromise = timeoutRejector(task.timeout, 'Task execution is aborted due to timeout')

  return Promise
    .race([
      taskExecutor(task, model),
      timeoutPromise
    ])
    .then(result => {
      timeoutPromise.cancel()

      return result
    })
}

/**
 * @param {CodeRunnerTask} task
 * @param {Object} opts
 */
function initClientSdk(task, opts) {
  if (task.initAppData) {
    Backendless.serverURL = task.initAppData.url

    if (!Backendless.Config) {
      Backendless.Config = {}
    }

    Object.assign(Backendless.Config, opts.backendless.public)

    const loggers = task.loggers || []

    const logLevels = loggers.reduce((map, logConfig) => {
      map[logConfig.name] = logConfig.level.toLowerCase()

      return map
    }, {})

    Backendless.initApp({
      appId  : task.applicationId,
      apiKey : task.initAppData.apiKey || task.initAppData.secretKey,
      logging: {
        loadLevels: false,
        levels    : logLevels
      }
    })

    if (opts.backendless.forwardableHeaders) {
      applyTransferringHeaders(task, opts.backendless.forwardableHeaders)
    }
  }
}

/**
 * BKNDLSS-27918
 *
 * @param {CodeRunnerTask} task
 * @param {Array<String>} forwardableHeaders
 */
function applyTransferringHeaders(task, forwardableHeaders) {
  const sourceHTTPHeaders = task.invocationContextDto.httpHeaders
  const targetHTTPHeaders = {}

  for (const httpHeaderKey in sourceHTTPHeaders) {
    if (forwardableHeaders[httpHeaderKey.toLowerCase()]) {
      targetHTTPHeaders[httpHeaderKey] = sourceHTTPHeaders[httpHeaderKey]
    }
  }

  const _nativeSend = Backendless.request.send._nativeSend || Backendless.request.send

  Backendless.request.send = function(options) {
    options = options ? { ...options } : {}
    options.headers = options.headers ? { ...targetHTTPHeaders, ...options.headers } : { ...targetHTTPHeaders }

    return _nativeSend.call(this, options)
  }

  Backendless.request.send._nativeSend = _nativeSend
}

/**
 * @param {CodeRunnerTask} task
 * @param {Object} opts
 */
function enrichTask(task, opts) {
  task.codePath = opts.debugModelCodePath
    ? opts.debugModelCodePath
    : path.resolve(opts.backendless.repoPath, task.applicationId.toLowerCase(), task.relativePath || '')

  //TODO: workaround for http://bugs.backendless.com/browse/BKNDLSS-12041
  if (task.___jsonclass === executor.RMI && task.eventId === SHUTDOWN_CODE) {
    task.___jsonclass = executor.RAI
    task.actionType = SHUTDOWN_ACTION
  }

  task.invocationContextDto = task.invocationContextDto || {}
  task.invocationContextDto.response = {
    headers: task.invocationContextDto.httpResponseHeaders || {},
  }
}

/**
 * @param {CodeRunnerTask} task
 * @param {?Error|ExceptionWrapper|String=} error
 * @param {?*} result
 * @returns {Object} task invocation result in JSON
 */
function wrapResult(task, error, result) {
  if (error) {
    const message = error instanceof timeoutRejector.Error
      ? error.message
      : error.stack || `Error: ${ error.message || error }`

    logger.error(message)
  }

  return wrapper.invocationResult(task.id, task.invocationContextDto, error, result)
}

/**
 * @param {CodeRunnerTask} task
 * @param {Object} opts
 */
const applySandbox = (task, opts) => {
  const sandboxRequired = opts.sandbox && task.mode !== Modes.MARKETPLACE

  if (sandboxRequired) {
    require('./sandbox').apply(task.applicationId)
  }
}

/**
 * @param {InvokeServiceTask|InvokeHandlerTask} task
 * @param {Object} opts
 * @returns {ServerCodeModel}
 */
function getServerCodeModel(task, opts) {
  opts.scModels = opts.scModels || {}

  if (opts.debugModelCodePath) {
    if (!opts.scModels[opts.debugModelCodePath]) {
      const ServerCodeModel = require('../../model')

      opts.scModels[opts.debugModelCodePath] = ServerCodeModel.build(opts.debugModelCodePath, opts.app.exclude)
    }

    return opts.scModels[opts.debugModelCodePath]
  }

  if (!opts.scModels[task.codePath]) {
    const ServerCodeModelDescriptor = require('../../model/descriptor')

    opts.scModels[task.codePath] = ServerCodeModelDescriptor.load(task.codePath)
  }

  return opts.scModels[task.codePath].getModelForFile(task.provider)
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
    enrichTask(task, opts)
    initClientSdk(task, opts)
    applySandbox(task, opts)

    if (!model && (task.provider || opts.debugModelCodePath)) {
      model = getServerCodeModel(task, opts)
    }

    response = await executeTask(task, model)

    if (response !== undefined) {
      response = wrapResult(task, null, response)
    }

  } catch (error) {
    if (error instanceof timeoutRejector.Error) {
      task.criticalError = error.message
    }

    response = wrapResult(task, error)
  }

  if (logger.verboseMode) {
    logger.verbose('[TRACE.REQUEST]:', JSON.stringify(task))
    logger.verbose('[TRACE.RESPONSE]:', JSON.stringify(response))
  }

  if (response && !response.exception) {
    response.arguments = response.arguments !== undefined
      ? wrapper.encodeArguments(response.arguments)
      : []
  }

  const stringifiedResponse = JSON.stringify(response)

  try {
    if (opts.responseSizeLimit > 0 && (stringifiedResponse.length > opts.responseSizeLimit)) {
      throw new Error('Response size limit exceeded')
    }
  } catch (error) {
    return JSON.stringify(wrapResult(task, error))
  }

  return stringifiedResponse
}
