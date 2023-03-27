/* eslint no-console:0 */

'use strict'

module.exports = async function getRunOptions(appRequired, repoPathRequired) {
  const { program } = require('commander')

  const getOptionsFromConfigurationFile = require('./file')
  const enrichWithENV = require('./env')
  const enrichWithProgramArguments = require('./program')

  const options = await getOptionsFromConfigurationFile(program.opts().config)

  const { initConfig } = require('backendless-js-services-core/lib/config')

  return await initConfig({
    defaults: require('./defaults.json'),
    config  : options,
    consul  : {
      serviceKey: 'config/coderunner/js/',
      extraKeys : require('./consul.json'),
    },
  }, async config => {

    normalizeBasicConfigs(config)

    enrichWithENV(config)

    await enrichWithProgramArguments(config, appRequired, repoPathRequired)

    ensureInternalApiUrl(config)
    ensureRateLimit(config)
    ensurePublicApiUrl(config)
    ensureForwardableHeaders(config)
    ensureLoggers(config)
    ensureWorkers(config)
    ensurePublicConfigs(config)
  })
}

const COMMON_BACKENDLESS_CONFIG_ITEMS = ['apiUrl', 'apiHost', 'apiPort', 'apiProtocol', 'apiUri', 'repoPath']

function normalizeBasicConfigs(config) {
  const { mergeConfigs } = require('backendless-js-services-core/lib/config')

  config.backendless = config.backendless || {}

  COMMON_BACKENDLESS_CONFIG_ITEMS.forEach(prop => {
    config.backendless[prop] = config[prop]

    delete config[prop]
  })

  config.backendless.msgBroker = mergeConfigs(config.backendless.msgBroker, config.redis['bl/production'])

  delete config.redis['bl/production']
}

function ensureInternalApiUrl(options) {
  if (!options.backendless.apiUrl) {
    const apiProtocol = options.backendless.apiProtocol || 'http'
    const apiHost = options.backendless.apiHost
    const apiPort = options.backendless.apiPort

    if (!apiHost) {
      throw new Error('options.backendless.apiUrl or options.backendless.apiHost is not specified!')
    }

    options.backendless.apiUrl = `${ apiProtocol }://${ apiHost }${ apiPort ? `:${ apiPort }` : '' }`
  }

  if (!options.backendless.apiUrl.startsWith('http:') && !options.backendless.apiUrl.startsWith('https:')) {
    options.backendless.apiUrl = `http://${ options.backendless.apiUrl }`
  }

  if (options.backendless.apiUri) {
    options.backendless.apiUrl = options.backendless.apiUrl + options.backendless.apiUri
  }

  if (!options.backendless.apiUrl) {
    throw new Error(
      '"options.backendless.apiServer" options is not configured\n' +
      '   Specify full url to the api server via "apiUrl" ' +
      'or via url parts [apiProtocol, apiHost, apiPort, apiUri] options'
    )
  } else {
    delete options.backendless.apiProtocol
    delete options.backendless.apiHost
    delete options.backendless.apiPort
    delete options.backendless.apiUri
  }
}

function ensureRateLimit(options) {
  options.rateLimit = options.rateLimit || {}

  if (!(options.rateLimit.default >= 1)) {
    options.rateLimit.enabled = false

    console.warn(
      'Apps RateLimit is disabled ' +
      `because "rateLimit.default=${ options.rateLimit.default }" which is less than 1`
    )
  }

  if (typeof options.rateLimit.overrides === 'string' && options.rateLimit.overrides) {
    const overrides = options.rateLimit.overrides.split(';')

    options.rateLimit.overrides = {}

    overrides.forEach(value => {
      const [appId, limit] = value.split(':')

      if (appId && limit) {
        options.rateLimit.overrides[appId] = parseInt(limit)
      }
    })

  } else {
    options.rateLimit.overrides = {}
  }
}

function ensurePublicApiUrl(options) {
  if (!options.backendless.public.publicAPIUrl) {
    const apiProtocol = options.backendless.publicProtocol || 'http'
    const apiHost = options.backendless.publicHost
    const apiPort = options.backendless.publicPort

    if (!apiHost) {
      throw new Error('options.backendless.public.publicAPIUrl or options.backendless.publicHost is not specified!')
    }

    options.backendless.public.publicAPIUrl = `${ apiProtocol }://${ apiHost }${ apiPort ? `:${ apiPort }` : '' }`
  }

  if (!options.backendless.public.publicAPIUrl.startsWith('http:') && !options.backendless.public.publicAPIUrl.startsWith('https:')) { // eslint-disable-line
    options.backendless.public.publicAPIUrl = `http://${ options.backendless.public.publicAPIUrl }`
  }

  if (options.backendless.public.publicAPIUri) {
    options.backendless.public.publicAPIUrl += options.backendless.public.publicAPIUri
  }

  if (!options.backendless.public.publicAPIUrl) {
    throw new Error(
      '"options.backendless.public.publicAPIUrl" options is not configured\n' +
      '   Specify full url to the api server via "publicAPIUrl" ' +
      'or via url parts [publicProtocol, publicHost, publicPort] options'
    )
  }

  delete options.backendless.publicProtocol
  delete options.backendless.publicHost
  delete options.backendless.publicPort
  delete options.backendless.publicAPIUri
}

function ensureForwardableHeaders(options) {
  if (typeof options.backendless.forwardableHeaders === 'string') {
    options.backendless.forwardableHeaders = options.backendless.forwardableHeaders.split(';')
  }

  if (Array.isArray(options.backendless.forwardableHeaders)) {
    const forwardableHeadersMap = {}

    options.backendless.forwardableHeaders.forEach(headerKey => {
      if (headerKey) {
        forwardableHeadersMap[headerKey.toLowerCase()] = 1
      }
    })

    options.backendless.forwardableHeaders = forwardableHeadersMap
  } else {
    delete options.backendless.forwardableHeaders
  }
}

function ensureLoggers(options) {
  options.loggers = options.loggers || {}

  if (typeof options.loggers.maxTextLength !== 'number') {
    delete options.loggers.maxTextLength
  }
}

function ensureWorkers(options) {
  options.workers = options.workers || {}
  options.workers.heartbeat = options.workers.heartbeat || {}

  if (!options.workers.heartbeat.codeInspectionTimeout) {
    options.workers.heartbeat.codeInspectionTimeout = options.workers.heartbeat.timeout
  }
}

function ensurePublicConfigs(options) {
  options.backendless.public = {
    fileDownloadUrl: options.backendless.public.fileDownloadUrl || options.backendless.public.publicAPIUrl, // eslint-disable-line
    publicAPIUrl   : options.backendless.public.publicAPIUrl,
    internalAPIUrl : options.backendless.apiUrl,
  }
}

