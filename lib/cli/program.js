'use strict'

const program = require('commander')
const logger = require('../util/logger')
const utils = require('./utils')

const UUID_PATTERN = '[A-F0-9\\-]{36}'
const DEFAULT_REPO_PATH = '/var/lib/backendless/repo/'
const DEFAULT_MODEL = 'default'

module.exports = async function enrichWithProgramArguments(options, appRequired, repoPathRequired) {
  if (options.sandbox && !process.setuid) {
    throw new Error('Sandbox for ServerCode is available only on POSIX platforms')
  }

  options.backendless.apiServer = program.apiServer || options.backendless.apiServer
  options.backendless.msgBroker.host = program.msgBrokerHost || options.backendless.msgBroker.host
  options.backendless.msgBroker.port = program.msgBrokerPort || options.backendless.msgBroker.port
  options.backendless.repoPath = program.repoPath || options.backendless.repoPath || DEFAULT_REPO_PATH

  options.zipSizeConfirmation = program.zipSizeConfirmation || options.app.zipSizeConfirmation
  options.keepZip = program.keepZip || options.keepSize
  options.verbose = logger.verbose = program.verbose || options.verbose

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

  app.model = program.model || app.model || DEFAULT_MODEL
  app.id = program.appId || app.id || await promptParam('Application ID')
  app.apiKey = program.appKey || app.apiKey || app.secretKey || await promptParam('API Key')

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
  return utils.prompt(`Please enter ${ name } and press [Enter]:`)
}