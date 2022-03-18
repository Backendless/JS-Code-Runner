'use strict'

const { program } = require('commander')
const utils = require('./utils')

const UUID_PATTERN = '[A-F0-9\\-]{36}'
const DEFAULT_REPO_PATH = '/var/lib/backendless/repo/'
const DEFAULT_MODEL = 'default'

module.exports = async function enrichWithProgramArguments(options, appRequired, repoPathRequired) {
  if (options.sandbox && !process.setuid) {
    throw new Error('Sandbox for ServerCode is available only on POSIX platforms')
  }

  const programOpts = program.opts()

  options.backendless.apiUrl = programOpts.apiServer || options.backendless.apiUrl || options.backendless.apiServer
  options.backendless.repoPath = programOpts.repoPath || options.backendless.repoPath || DEFAULT_REPO_PATH

  options.backendless.msgBroker.host = programOpts.msgBrokerHost || options.backendless.msgBroker.host
  options.backendless.msgBroker.port = programOpts.msgBrokerPort || options.backendless.msgBroker.port

  if (programOpts.cacheLimit) {
    options.workers = options.workers || {}
    options.workers.cache = utils.isObject(options.workers.cache) ? options.workers.cache : {}
    options.workers.cache.limit = programOpts.cacheLimit
  }

  options.zipSizeConfirmation = programOpts.zipSizeConfirmation || options.app.zipSizeConfirmation
  options.keepZip = programOpts.keepZip || options.keepZip
  options.verbose = programOpts.verbose || options.verbose
  options.debug = programOpts.debug || options.debug || options.verbose

  if (appRequired) {
    await ensureApp(options)
  }

  if (repoPathRequired) {
    await ensureRepoPath(options)
  }
}

function ensureRepoPath(options) {
  const repoPath = options.backendless.repoPath

  if (!require('fs').existsSync(repoPath)) {
    throw new Error(`[repoPath] parameter points to not existing folder: [${repoPath}]`)
  }
}

async function ensureApp(options) {
  const app = options.app = options.app || {}

  const programOpts = program.opts()

  app.model = programOpts.model || app.model || DEFAULT_MODEL
  app.id = programOpts.appId || app.id || await promptParam('Application ID')
  app.apiKey = programOpts.appKey || app.apiKey || app.secretKey || await promptParam('API Key')

  assertValueIsUUID(app.id, 'Application ID')
  assertValueIsUUID(app.apiKey, 'CodeRunner API Key')

  return options
}

function assertValueIsUUID(value, name) {
  if (!value || !value.match(UUID_PATTERN)) {
    throw new Error(`${name} is invalid`)
  }
}

function promptParam(name) {
  return utils.prompt(`Please enter ${name} and press [Enter]:`)
}
