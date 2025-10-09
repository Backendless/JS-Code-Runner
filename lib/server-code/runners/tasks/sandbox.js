'use strict'

const logger = require('../../../util/logger')

exports.processSetuid = process.setuid.bind(process)

let applied = false

const ANALYTICS_HEADER_KEY = 'X-Backendless-CodeRunner-App-ID'

exports.apply = (applicationId, enableAnalyticsHeader) => {
  if (applied) {
    return
  }

  // Block dangerous process methods
  process.send = getThrower('Calling process.send')
  process.kill = getThrower('Calling process.kill')

  const child_process = require('child_process')

  overrideModuleMethods('ChildProcess', child_process)

  child_process.ChildProcess = getThrower('Class ChildProcess')

  if (enableAnalyticsHeader) {
    // Intercept HTTP/HTTPS requests while blocking server creation
    const http = require('http')
    const https = require('https')

    // Intercept outgoing HTTP requests
    const originalHttpRequest = http.request
    const originalHttpGet = http.get
    const originalHttpsRequest = https.request
    const originalHttpsGet = https.get

    http.request = function(...args) {
      interceptRequest(args, applicationId)

      return originalHttpRequest.apply(this, args)
    }

    http.get = function(...args) {
      interceptRequest(args, applicationId)

      return originalHttpGet.apply(this, args)
    }

    https.request = function(...args) {
      interceptRequest(args, applicationId)

      return originalHttpsRequest.apply(this, args)
    }

    https.get = function(...args) {
      interceptRequest(args, applicationId)

      return originalHttpsGet.apply(this, args)
    }

    // Intercept fetch API (Node.js 18+)
    if (typeof global.fetch === 'function') {
      const originalFetch = global.fetch

      global.fetch = function(resource, options = {}) {
        // Ensure headers exist
        if (!options.headers) {
          options.headers = {}
        }

        // Handle Headers object or plain object
        if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
          options.headers.set(ANALYTICS_HEADER_KEY, applicationId)
        } else if (typeof options.headers === 'object') {
          options.headers[ANALYTICS_HEADER_KEY] = applicationId
        }

        return originalFetch.call(this, resource, options)
      }
    }
  }

  const appUid = applicationId.replace(/-/g, '').toLowerCase()

  try {
    process.setuid(appUid)
  } catch (e) {
    logger.error(e.message)

    throw new Error('Failed to run code in sandbox on behalf of application\'s system user.')
  }

  applied = true
}

function interceptRequest(args, applicationId) {
  // Handle different argument formats for http.request/get
  let options = args[0]

  if (typeof options === 'string' || options instanceof URL) {
    // Convert URL/string to options object
    options = typeof options === 'string' ? new URL(options) : options
    args[0] = {
      protocol: options.protocol,
      hostname: options.hostname,
      port    : options.port,
      path    : options.pathname + options.search,
      headers : {}
    }
  } else if (options && typeof options === 'object') {
    // Ensure headers object exists
    if (!options.headers) {
      options.headers = {}
    }
  }

  // Add custom header to all requests
  if (args[0] && args[0].headers) {
    args[0].headers[ANALYTICS_HEADER_KEY] = applicationId
  }
}

function overrideModuleMethods(name, module) {
  Object.keys(module).forEach(method => {
    if (typeof module[method] === 'function') {
      module[method] = getThrower(`Calling ${ name }.${ method } method`)
    }
  })
}

function getThrower(initiator) {
  return function() {
    throw new Error(`${ initiator } is not allowed inside Business Logic`)
  }
}