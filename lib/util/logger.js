/* eslint no-console:0 */

/**
 * Logging tool for Backendless CodeRunner
 * @module util/logger
 */

'use strict'

const Backendless = require('backendless')
const util = require('util')
const { compactDate } = require('./date')

const silent = process.env.NODE_ENV === 'test'

const logger = {}
logger.verboseMode = false
logger.debugMode = false
logger.usePid = false
logger.useAppId = false
logger.useFullAppId = false
logger.useBackendlessLogging = false
logger.appAliases = {}

logger.initWinston = function(winstonLoggers) {
  if (winstonLoggers) {
    logger.winston = require('./logger-winston')(winstonLoggers)
    logger.ignoreWorkersLog = !winstonLoggers.workers
  }
}

logger.info = logger.log = function() {
  if (!silent) {
    console.log.apply(console, arguments)
  }
}

logger.warn = function() {
  if (!silent) {
    console.warn.apply(console, arguments)
  }
}

logger.error = function() {
  if (!silent) {
    console.error.apply(console, arguments)
  }
}

logger.debug = function() {
  if (logger.debugMode) {
    logger.log.apply(logger, arguments)
  }
}

logger.verbose = function() {
  if (logger.verboseMode) {
    logger.log.apply(logger, ensureTextsLength(arguments))
  }
}

function ensureTextsLength(args) {
  if (!logger.maxTextLength) {
    return args
  }

  const result = []

  for (const arg of args) {
    if (typeof arg === 'string' && arg.length > logger.maxTextLength) {
      const truncatedStr = arg.substring(0, logger.maxTextLength)

      result.push(
        `${ truncatedStr }... ||=======>>> THE OUTPUT HAS BEEN TRUNCATED, ` +
        `THERE ARE MORE ${ arg.length - logger.maxTextLength } CHARACTERS`
      )
    } else {
      result.push(arg)
    }
  }

  return result
}

const getAppId = () => {
  const appId = Backendless.appId

  return appId && (logger.appAliases[appId] || appId)
}

const decorateLogFn = (fn, logCategory) => {
  return function() {
    const message = util.format.apply(util, arguments)

    if (logger.useBackendlessLogging) {
      Backendless.Logging.getLogger('SERVER_CODE')[logCategory](`[${ process.pid }] ${ message }`)
    }

    const meta = [compactDate(new Date())]

    meta.push(`[${ logger.usePid ? process.pid : 'master' }]`)

    if (logger.useAppId && getAppId()) {
      meta.push(`[${ getAppId() }]`)
    }

    if (logger.winston) {
      logger.winston[logCategory](util.format.apply(util, [...meta, message]))
    } else {
      fn.call(this, ...meta, message)
    }
  }
}

console.log = decorateLogFn(console.log, 'info')
console.warn = decorateLogFn(console.warn, 'warn')
console.error = decorateLogFn(console.error, 'error')

module.exports = logger
