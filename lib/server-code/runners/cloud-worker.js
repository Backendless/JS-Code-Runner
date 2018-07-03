'use strict'

const Backendless = require('backendless')
const logger = require('../../util/logger')
const MessagesBroker = require('../services/messages-broker')
const tasksExecutor = require('./tasks/executor')

const TASKS_CHANNEL = 'CODE_RUNNER_DRIVER'

const flushPendingLogs = () => {
  if (Backendless.applicationId) {
    return Backendless.Logging.flush().catch(err => {
      logger.error('Error during logs flushing', err.message || err)
    })
  }
}

module.exports = async function(opts) {
  logger.usePid = true
  logger.useAppId = true
  logger.useBackendlessLogging = true
  logger.appAliases = opts.backendless.appAliases || {}

  const messageBroker = new MessagesBroker(opts.backendless.msgBroker, false)
  messageBroker.on('error', err => {
    logger.error(err)
    process.exit(1)
  })

  const getTask = () => messageBroker.getTask(TASKS_CHANNEL)

  startHeartbeat(opts)

  /**
   * @param {CodeRunnerTask} task
   * @returns {Promise.<void>}
   */
  const processTask = async task => {
    const time = process.hrtime()

    process.send({ task })

    async function sendResult(result) {
      const duration = process.hrtime(time)
      const ms = duration[0] * 1000 + duration[1] / 1e6

      logger.info(`Processing finished in ${ms.toFixed(3)}ms`)

      if (result) {
        logger.debug('Sending results to Redis')

        await messageBroker.setTaskResult(task, result)

        logger.debug('Task results sent')
      }
    }

    try {
      const result = await tasksExecutor.execute(task, opts)

      await sendResult(result)

      return result

    } catch (error) {
      logger.error(`Error during task execution. ${error.message || error}`)
    }
  }

  try {
    await messageBroker.init()

    const task = await getTask()

    await processTask(task)

    await flushPendingLogs()

  } catch (error) {
    logger.error(error.message)
  }

  process.exit()
}

function startHeartbeat(opts) {
  setInterval(() => process.send('heartbeat'), opts.workersHeartbeat.interval * 1000)
}