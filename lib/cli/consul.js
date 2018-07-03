'use strict'

const Backendless = require('backendless')

const logger = require('../util/logger')

const CONSUL_HOST = process.env.BL_CONSUL_HOST
const CONSUL_PORT = process.env.BL_CONSUL_PORT

if (CONSUL_PORT && !CONSUL_HOST) {
  throw new Error('BL_CONSUL_HOST and BL_CONSUL_PORT must be both specified in ENV.')
}

const CONSUL_URL = CONSUL_PORT ? `${CONSUL_HOST}:${CONSUL_PORT}` : CONSUL_HOST

const CONSUL_ROOT_KEY = 'config/coderunner/js/'

module.exports = async function enrichWithConsul(options) {
  if (CONSUL_URL) {
    const consulItems = await loadInternalConsulKeys()
    const consulOptions = await parseConsulKeys(consulItems)

    await enrichWithExternalConsulKeys(consulOptions)
    await mergeOptionsWithConsulOptions(options, consulOptions)
  }
}

async function loadInternalConsulKeys() {
  logger.info('Start loading coderunner config from Consul by URL:', CONSUL_URL)

  try {
    const data = await Backendless.Request.get(`http://${CONSUL_URL}/v1/kv/${CONSUL_ROOT_KEY}`).query({ recurse: true })

    logger.info('Coderunner configs are successful loaded from Consul!')

    return data

  } catch (error) {
    logger.error('Can not load Coderunner configs from Consul!', error)

    throw error
  }
}

async function enrichWithExternalConsulKeys(consulOptions) {
  await Promise.all([
    enrichWithExternalConsulKey(consulOptions.backendless, 'apiServer', 'config/server/httpAddress'),
    enrichWithExternalConsulKey(consulOptions.backendless, 'repoPath', 'config/repository/location'),
    enrichWithExternalConsulKey(consulOptions.redis, 'host', 'config/redis/bl/production/host'),
    enrichWithExternalConsulKey(consulOptions.redis, 'port', 'config/redis/bl/production/port'),
    enrichWithExternalConsulKey(consulOptions.redis, 'password', 'config/redis/bl/production/password'),
  ])
}

function parseConsulKeys(consulItems) {
  const consulOptions = { redis: {} }

  consulItems.forEach(consulItem => {
    const pathTokens = consulItem.Key.replace(CONSUL_ROOT_KEY, '').split('/')
    const pathTokensLength = pathTokens.length

    let parent = consulOptions

    pathTokens.forEach((key, index) => {
      const isLastKey = pathTokensLength === index + 1

      if (isLastKey) {
        parent[key] = parseValue(consulItem.Value)
      } else {
        parent = parent[key] = ensureObject(parent[key])
      }
    })
  })

  return consulOptions
}

function mergeOptionsWithConsulOptions(options, consulOptions) {
  if (!isUndefined(consulOptions.sandbox)) {
    options.sandbox = consulOptions.sandbox
  }

  if (!isUndefined(consulOptions.verbose)) {
    options.verbose = consulOptions.verbose
  }

  if (!isUndefined(consulOptions.workers)) {
    options.workers = consulOptions.workers
  }

  if (isObject(consulOptions.workersHeartbeat)) {
    options.workersHeartbeat = Object.assign(options.workersHeartbeat, consulOptions.workersHeartbeat)
  }

  if (isObject(consulOptions.redis)) {
    options.backendless.msgBroker = Object.assign(options.backendless.msgBroker, consulOptions.redis)
  }
}

function isUndefined(value) {
  return typeof value === 'undefined'
}

function isObject(value) {
  return typeof value !== 'object' && value !== null
}

function ensureObject(value) {
  return (typeof value === 'object' && value !== null)
    ? value
    : {}
}

function parseValue(source) {
  const str = Buffer.from(source, 'base64').toString()

  try {
    return JSON.parse(str)
  } catch (e) {
    //can't parse, that means it's just a string
  }

  return str
}

async function enrichWithExternalConsulKey(object, property, consulKey) {
  logger.info(`Load external config from Consul, key: [${consulKey}]`)

  try {
    const value = await Backendless.Request.get(`http://${CONSUL_URL}/v1/kv/${consulKey}?raw`)

    if (!isUndefined(value)) {
      object[property] = value
    }

  } catch (e) {
    //if value by the passed consul key doesn't exist just ignore it
  }
}
