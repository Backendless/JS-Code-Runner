'use strict'

const logger           = require('../../util/logger'),
      promiseWhile     = require('../../util/promise').promiseWhile,
      ApiServerService = require('../services/api-server'),
      MessagesBroker   = require('../services/messages-broker'),
      tasksExecutor    = require('./tasks/executor'),
      ServerCodeModel  = require('../model')

const SESSION_TTL = 60 //60 secs
const SESSION_RENEWAL_INTERVAL = 45000 //45 secs

class DebugCodeRunner {
  constructor(opts) {
    this.options = opts

    this.apiServer = new ApiServerService(opts.app, opts.backendless.apiServer)

    this.messageBroker = new MessagesBroker(opts.backendless.msgBroker, true)
    this.messageBroker.on('error', (err) => this.stop(err))
  }

  async start() {
    logger.info('Starting Debug Code Runner...')

    await this.buildModel()
    await this.messageBroker.init()

    try {
      await this.registerRunner()
      await this.keepDebugSessionAlive()
      await this.registerModel()
      await this.listenTasksChannel()

    } catch (error) {
      await this.stop(error)
    }
  }

  buildModel() {
    if (!this.model) {
      this.model = ServerCodeModel.build(process.cwd(), this.options.app.exclude)

      if (this.model.isEmpty()) {
        throw new Error('Nothing to Debug')
      }
    }
  }

  stop(err) {
    const stopTasks = []

    if (!this.stopped) {
      if (err) {
        logger.error(err.message || err)
      }

      if (this.sessionRenewalTimer) {
        clearTimeout(this.sessionRenewalTimer)
      }

      if (this.debugSessionId) {
        stopTasks.push(this.apiServer.unregisterRunner())
      }

      stopTasks.push(this.messageBroker.end())

      this.stopped = true
    }

    return Promise.all(stopTasks)
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

  async listenTasksChannel() {
    logger.info('Waiting for Server Code tasks..')

    const tasksQueue = this.options.app.id
    const running = () => !this.stopped

    try {
      const task = await promiseWhile(running, () => this.messageBroker.getTask(tasksQueue))

      await this.processTask(task)

    } catch (error) {
      logger.error(error.message)
    }
  }

  async processTask(task) {
    const msgBroker = this.messageBroker

    function taskMsg(msg) {
      return `[${task.id}] ${msg}`
    }

    function sendResult(result) {
      logger.info(taskMsg('Processing finished'))

      if (result) {
        logger.debug(taskMsg('Sending results to Redis'))

        msgBroker.setTaskResult(task, result)
          .then(() => logger.debug(taskMsg('Task results sent')))
      }
    }

    function logError(err) {
      logger.error(taskMsg(`Error during task execution. ${err.message || err}`))
    }

    logger.info(taskMsg('New task arrived!'))

    try {
      const result = await tasksExecutor.execute(task, this.options, this.model)

      sendResult(result)
    } catch (error) {
      logError(error)
    }

  }
}

module.exports = function(opts) {
  return new DebugCodeRunner(Object.assign(opts, { sandbox: false }))
}