'use strict'

let criticalError = null

const setCriticalError = process.setCriticalError = error => {
  criticalError = `${ error }` || 'Unknown Error'
}

setProcessTitle('IDLING')
decorateModuleRequire()

const { promisifyNode } = require('../../util/promise')
const { hrtime } = require('../../util/date')

const processSend = promisifyNode(process.send, process)

require('backendless').ServerCode = require('../../server-code/api')

const path = require('path')
const Backendless = require('backendless')

const logger = require('../../util/logger')
const tasksExecutor = require('./tasks/executor')

// it's important thing when we run the code-runner from somewhere outside the code-runner directory
const CODE_RUNNER_ABSOLUTE_PATH = path.resolve(__dirname, '../../../')

const RunOptions = JSON.parse(process.env.RUN_OPTIONS)
delete process.env.RUN_OPTIONS

Object.keys(process.env).forEach(key => {
  if (key.startsWith('BL_') || key.startsWith('KUBERNETES_')) {
    delete process.env[key]
  }
})

logger.usePid = true
logger.useAppId = true
logger.useBackendlessLogging = RunOptions.loggers.backendless !== false
logger.appAliases = RunOptions.backendless.appAliases || {}
logger.verboseMode = RunOptions.verbose
logger.debugMode = RunOptions.debug
logger.maxTextLength = RunOptions.loggers.maxTextLength

function setProcessTitle(label) {
  process.title = `Backendless JS CodeRunner - ${ label || 'UNKNOWN' }`
}

const flushPendingLogs = async () => {
  if (Backendless.appId && logger.useBackendlessLogging) {
    const getFlushingTime = hrtime()

    let userId = null
    let userToken = null

    try {
      logger.debug('Flushing logs')

      userId = Backendless.Users.getCurrentUserId()
      userToken = Backendless.getCurrentUserToken()

      await Backendless.Logging.flush()

      logger.debug(`Flushed logs in ${ getFlushingTime() }ms`)
    } catch (error) {
      logger.error(
        `Error during logs flushing, errorCode=[${ error.code }] userId=[${ userId }] userToken=[${ userToken }]`,
        error.message || error
      )
    }
  }
}

/**
 * @param {CodeRunnerTask} task
 * @returns {void}
 */
const executeTask = async task => {
  try {
    const getExecuteTime = hrtime()

    const taskResult = await tasksExecutor.execute(task, RunOptions)

    if (task.criticalError) {
      setCriticalError(task.criticalError)
    }

    logger.info(`Processing finished in ${ getExecuteTime() }ms`)

    await processSend({ processed: true, taskResult })

    if (taskResult) {
      logger.debug('Task results sent')
    }

  } catch (error) {
    logger.error(`Error during task execution. ${ error.message || error }`)
  }
}

const processTask = async task => {
  if (!RunOptions.appWorkingDir) {
    setProcessTitle(task.applicationId)

    const backendlessRepoPath = RunOptions.backendless.repoPath
    const appId = task.applicationId.toLowerCase()

    RunOptions.appWorkingDir = path.resolve(CODE_RUNNER_ABSOLUTE_PATH, backendlessRepoPath, appId)
  }

  await executeTask(task)
  await flushPendingLogs()

  if (criticalError) {
    await processSend({ criticalError })
  }

  await processSend('idling')
}

function handleTermination() {
  // need to prevent shutting down the worker once the master process is stopping
  // the worker process will be terminated with the "SIGKILL" signal from the master process
}

process.on('message', message => {
  if (message.task) {
    processTask(message.task)
  }
})

process.on('SIGINT', handleTermination)
process.on('SIGTERM', handleTermination)

if (RunOptions.workers.heartbeat.enabled) {
  setInterval(() => {
    processSend('heartbeat')
  }, RunOptions.workers.heartbeat.interval * 1000)
}

processSend('started')

function decorateModuleRequire() {
  const Module = require('module')

  const nodeRequire = Module.prototype.require

  Module.prototype.require = function(modulePath) {
    try {
      return nodeRequire.call(this, modulePath)
    } catch (e) {
      if (process.setCriticalError) {
        process.setCriticalError(e)
      }

      throw e
    }
  }
}

