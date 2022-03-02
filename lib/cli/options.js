/* eslint no-console:0 */

'use strict'

module.exports = async function getRunOptions(appRequired, repoPathRequired) {
  const { program } = require('commander')

  const getOptionsFromConfigurationFile = require('./file')
  const enrichWithConsul = require('./consul')
  const enrichWithENV = require('./env')
  const enrichWithProgramArguments = require('./program')

  const options = await getOptionsFromConfigurationFile(program.opts().config)

  await enrichWithConsul(options)
  await enrichWithENV(options)
  await enrichWithProgramArguments(options, appRequired, repoPathRequired)

  ensureInternalApiUrl(options)

  ensureRateLimit(options)

  ensurePublicApiUrl(options)

  ensureRedisTLS(options)

  ensurePublicConfigs(options)

  return options
}

function ensureInternalApiUrl(options) {
  options.backendless.apiUrl = process.env.APIURL || options.backendless.apiUrl
  options.backendless.apiUri = process.env.APIURI || options.backendless.apiUri

  if (!options.backendless.apiUrl) {
    const apiProtocol = process.env.APIPROTOCOL || options.backendless.apiProtocol || 'http'
    const apiHost = process.env.APIHOST || options.backendless.apiHost
    const apiPort = process.env.APIPORT || options.backendless.apiPort

    if (!apiHost) {
      throw new Error('options.backendless.apiUrl or options.backendless.apiHost is not specified!')
    }

    options.backendless.apiUrl = `${apiProtocol}://${apiHost}${apiPort ? `:${apiPort}` : ''}`
  }

  if (!options.backendless.apiUrl.startsWith('http:') && !options.backendless.apiUrl.startsWith('https:')) {
    options.backendless.apiUrl = `http://${options.backendless.apiUrl}`
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
      `because "rateLimit.default=${options.rateLimit.default}" which is less than 1`
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
  options.backendless.public.publicAPIUrl = process.env.PUBLIC_API_URL || options.backendless.public.publicAPIUrl
  options.backendless.public.publicAPIUri = process.env.PUBLIC_API_URI || options.backendless.public.publicAPIUri

  if (!options.backendless.public.publicAPIUrl) {
    const apiProtocol = process.env.PUBLIC_API_PROTOCOL || options.backendless.publicProtocol || 'http'
    const apiHost = process.env.PUBLIC_API_HOST || options.backendless.publicHost
    const apiPort = process.env.APIPORT || options.backendless.publicPort

    if (!apiHost) {
      throw new Error('options.backendless.public.publicAPIUrl or options.backendless.publicHost is not specified!')
    }

    options.backendless.public.publicAPIUrl = `${apiProtocol}://${apiHost}${apiPort ? `:${apiPort}` : ''}`
  }

  if (!options.backendless.public.publicAPIUrl.startsWith('http:') && !options.backendless.public.publicAPIUrl.startsWith('https:')) { // eslint-disable-line
    options.backendless.public.publicAPIUrl = `http://${options.backendless.public.publicAPIUrl}`
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

function ensureRedisTLS(options) {
  const fs = require('fs')

  if (options.backendless.msgBroker.ssl) {
    options.backendless.msgBroker.tls = options.backendless.msgBroker.tls || {}
  } else {
    delete options.backendless.msgBroker.tls
  }

  delete options.backendless.msgBroker.ssl

  const redisTLS = options.backendless.msgBroker.tls

  if (redisTLS) {
    if (redisTLS.rejectUnauthorized === undefined) {
      redisTLS.rejectUnauthorized = false
    }

    if (redisTLS.certFile) {
      redisTLS.cert = fs.readFileSync(redisTLS.certFile, 'utf8')

      delete redisTLS.certFile
    }

    if (redisTLS.keyFile) {
      redisTLS.key = fs.readFileSync(redisTLS.keyFile, 'utf8')

      delete redisTLS.keyFile
    }

    if (redisTLS.caFile) {
      redisTLS.ca = fs.readFileSync(redisTLS.caFile, 'utf8')

      delete redisTLS.caFile
    }
  }
}

function ensurePublicConfigs(options) {
  options.backendless.public = {
    fileDownloadUrl: process.env.FILE_DOWNLOAD_URL || options.backendless.public.fileDownloadUrl || options.backendless.public.publicAPIUrl, // eslint-disable-line
    publicAPIUrl   : options.backendless.public.publicAPIUrl,
    internalAPIUrl : options.backendless.apiUrl,
  }
}

