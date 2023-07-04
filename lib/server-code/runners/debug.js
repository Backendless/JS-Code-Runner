'use strict'

const logger = require('../../util/logger')
const ApiServerService = require('../services/api-server')
const ServerCodeModel = require('../model')
const CloudMaster = require('./cloud-master')

const SESSION_TTL = 60 //60 secs
const SESSION_RENEWAL_INTERVAL = 45000 //45 secs

class DebugCodeRunner extends CloudMaster {

  constructor(opts) {
    opts = prepareOpts(opts)

    super(opts)

    this.apiServer = new ApiServerService(opts.app, opts.backendless.apiUrl)

    this.app = this.options.app

    this.mainTasksQueue = this.app.id

    this.lpTasksQueue = null
    this.lowPriorityThreshold = 0

    this.compression.enabled = this.options.compression.debug
  }

  exitOnErrorInMessageBroker(error) {
    logger.error('Exist the coderunner debugger because of the error in the MessageBroker: ', error)

    this.stop(error)
  }

  async start() {
    logger.info('Starting Debug Code Runner...')

    await this.buildModel()

    try {
      this.initWorkersBroker()

      await this.registerRunner()

      await this.startMessageBroker()

      await this.keepDebugSessionAlive()
      await this.registerModel()

      this.onReadyForNextTasks()

    } catch (error) {
      await this.stop(error)
    }
  }

  buildModel() {
    if (!this.model) {
      this.model = ServerCodeModel.build(this.options.debugModelCodePath, this.app.exclude)

      if (this.model.isEmpty()) {
        throw new Error('Nothing to Debug')
      }
    }
  }

  async stop(err) {
    const stopped = this.stopped

    if (!stopped && err) {
      logger.error(err.message || err)
    }

    await super.stop()

    if (!stopped) {
      if (this.sessionRenewalTimer) {
        clearTimeout(this.sessionRenewalTimer)
      }

      if (this.debugSessionId) {
        await this.apiServer.unregisterRunner()
      }
    }
  }

  registerModel() {
    return this.apiServer.registerModel(this.model)
  }

  async registerRunner() {
    this.debugSessionId = await this.apiServer.registerRunner()
  }

  keepDebugSessionAlive() {
    this.sessionRenewalTimer && clearTimeout(this.sessionRenewalTimer)

    this.sessionRenewalTimer = setTimeout(async () => {
      try {
        await this.messageBroker.expireKey(this.debugSessionId, SESSION_TTL, 'Debug Session ID')

        this.keepDebugSessionAlive()
      } catch (error) {
        logger.error(error.message || error)

        if (!this.stopped) {
          process.exit(-1)
        }
      }
    }, SESSION_RENEWAL_INTERVAL)
  }

}

module.exports = function(opts) {
  return new DebugCodeRunner(opts)
}

function prepareOpts(opts) {
  opts.sandbox = false
  opts.rateLimit.enabled = false
  opts.workers.heartbeat.enabled = false
  opts.debugModelCodePath = process.cwd()

  return opts
}
