/* eslint no-console:0 */

/**
 * Logging tool for Backendless CodeRunner
 * @module util/logger
 */

'use strict'

const Backendless = require('backendless')
const util = require('util')
const silent = process.env.NODE_ENV === 'test'

function zeroPad(n, size) {
  n = n.toString()

  while (n.length < size) {
    n = `0${n}`
  }

  return n
}

// 16:19:34.754
function timestamp() {
  const d = new Date()

  const time = [
    zeroPad(d.getHours(), 2),
    zeroPad(d.getMinutes(), 2),
    zeroPad(d.getSeconds(), 2)
  ].join(':')

  return [time, zeroPad(d.getMilliseconds(), 3)].join('.')
}

const logger = {}
logger.verbose = false
logger.usePid = false
logger.useAppId = false
logger.useFullAppId = false
logger.useBackendlessLogging = false
logger.appAliases = {}

logger.info = logger.log = function() {
  if (!silent) {
    console.log.apply(console, arguments)
  }
}

logger.error = function() {
  if (!silent) {
    console.error.apply(console, arguments)
  }
}

logger.debug = function() {
  if (logger.verbose) {
    logger.log.apply(logger, arguments)
  }
}

const getAppId = () => {
  const appId = Backendless.applicationId

  return appId && (logger.appAliases[appId] || appId)
}

const decorateLogFn = (fn, logCategory) => {
  return function() {
    const message = util.format.apply(util, arguments)

    if (logger.useBackendlessLogging) {
      Backendless.Logging.getLogger('SERVER_CODE')[logCategory](`[${process.pid}] ${message}`)
    }

    const meta = [timestamp()]

    if (logger.usePid) {
      meta.push(`[${process.pid}]`)
    }

    if (logger.useAppId && getAppId()) {
      meta.push(`[${getAppId()}]`)
    }

    fn.call(this, ...meta, message)
  }
}

console.log = decorateLogFn(console.log, 'info')
console.warn = decorateLogFn(console.warn, 'warn')
console.error = decorateLogFn(console.error, 'error')

module.exports = logger