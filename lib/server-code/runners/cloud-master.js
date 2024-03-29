'use strict'

const logger = require('../../util/logger')
const { hrtime } = require('../../util/date')
const MessagesBroker = require('../services/messages-broker')
const WorkersBroker = require('./cloud-workers-broker')
const managementServer = require('../services/management-server')
const tasksExecutor = require('./tasks/executor')

const initStatusService = require('./status')

const SERVICE_QUEUE_P_CR_EVENT = 'SERVICE_QUEUE_P_CR'
const CLEANUP_CODE_ALL_COMMAND = 'cleanup_code_all'

module.exports = class CloudMaster {

  constructor(options) {
    this.options = options

    this.lowPriorityThreshold = this.options.workers.lowPriorityThreshold
    this.taskRequests = {}

    this.compression = {
      enabled  : this.options.compression.prod,
      threshold: this.options.compression.threshold,
    }

    this.mainTasksQueue = MessagesBroker.TASKS_CHANNEL
    this.lpTasksQueue = MessagesBroker.TASKS_CHANNEL_LP

    this.onReadyForNextTasks = this.onReadyForNextTasks.bind(this)
    this.onTaskProcessed = this.onTaskProcessed.bind(this)

    this.stopStatusService = initStatusService(options)
  }

  initWorkersBroker() {
    this.workersBroker = new WorkersBroker(this.options.workers, this.options)

    this.workersBroker.on(WorkersBroker.Events.READY_FOR_NEXT_TASK, this.onReadyForNextTasks)
    this.workersBroker.on(WorkersBroker.Events.TASK_PROCESSED, this.onTaskProcessed)
  }

  async startManagementServer() {
    await managementServer.start(this.options, this.workersBroker, this.messageBroker)
  }

  async startMessageBroker() {
    this.messageBroker = new MessagesBroker({
      connection          : this.options.backendless.msgBroker,
      compressionEnabled  : this.compression.enabled,
      compressionThreshold: this.compression.threshold,
      gettersCount        : this.lowPriorityThreshold ? 2 : 1,
    })

    this.messageBroker.on('error', this.exitOnErrorInMessageBroker)
    this.messageBroker.on('reconnect', this.onReadyForNextTasks)

    await this.messageBroker.init()

    this.messageBroker.subscribe(SERVICE_QUEUE_P_CR_EVENT, message => {
      if (message.command === CLEANUP_CODE_ALL_COMMAND) {
        this.workersBroker.killAllAppWorkers(message.applicationId, 'New Business Logic for app has been deployed.')
      }
    })
  }

  async start() {
    logger.info(`Starting Backendless ${ this.options.label || 'Cloud' } Code Runner for JS`)
    logger.info(`Backendless Repository Path is set to [${ this.options.backendless.repoPath }]`)

    this.initWorkersBroker()

    await this.startMessageBroker()
    await this.startManagementServer()

    this.onReadyForNextTasks()
  }

  onReadyForNextTasks() {
    if (this.stopped) {
      return
    }

    const currentWorkersLoad = this.workersBroker.getCurrentLoad()
    const availableWorkersCount = this.workersBroker.getAvailableWorkersCount()

    logger.info(`Ready and waiting for Server Code tasks... (${ this.workersBroker.getStatsString() })`)

    if (availableWorkersCount > 0) {
      this.waitAndProcessNextTask(this.mainTasksQueue)
    }

    if (this.lowPriorityThreshold && this.lowPriorityThreshold > currentWorkersLoad && availableWorkersCount > 1) {
      /**
       * subscribe to LP Queue only if:
       *  - workers.lowPriorityThreshold is configured and value is more than zero
       *  - current workers load less than workers.lowPriorityThreshold
       *  - and there at least 2 available workers to process incoming tasks
       * **/
      this.waitAndProcessNextTask(this.lpTasksQueue)
    }
  }

  isTaskOutdated(task) {
    const { timestamp, timeout, invocationOverheadTimeoutInMillis } = task

    if (!invocationOverheadTimeoutInMillis) {
      return false
    }

    return (timestamp + timeout + invocationOverheadTimeoutInMillis) < Date.now()
  }

  waitAndProcessNextTask(tasksChannel) {
    if (!this.taskRequests[tasksChannel]) {
      this.taskRequests[tasksChannel] = Promise.resolve()
        .then(() => {
          return this.messageBroker.getTask(tasksChannel)
            .catch(error => {
              logger.error('Could not get a task due to:', error)

              throw error
            })
        })
        .then(async task => {
          const appId = task.applicationId

          logger.debug(`Received a new task with id=${ task.id }`)

          if (this.isTaskOutdated(task)) {
            logger.debug(`Task with id=${ task.id } is outdated, ignore it`)

            this.taskRequests[tasksChannel] = null

            this.onReadyForNextTasks()

          } else if (this.workersBroker.isAppRateLimitReached(appId)) {
            await this.messageBroker.pushTaskBack(tasksChannel, task)

            this.taskRequests[tasksChannel] = null

            this.onReadyForNextTasks()
          } else {
            task.getProcessingDuration = hrtime()

            task = Object.assign(task, { cacheable: tasksExecutor.isTaskCacheable(task) })

            const resetRequestBefore = this.workersBroker.getAvailableWorkersCount() > 2

            if (resetRequestBefore) {
              this.taskRequests[tasksChannel] = null
            }

            const getFindingWorkerTime = hrtime()

            const worker = await this.workersBroker.getWorkerForTask(task.applicationId, task.cacheable)

            logger.debug(
              `[${ worker.process.pid }] found an available worker in ${ getFindingWorkerTime() }ms ` +
              `for task with id=${ task.id }, the worker has been started in ${ worker.startedIn }ms`
            )

            if (!resetRequestBefore) {
              this.taskRequests[tasksChannel] = null
            }

            this.workersBroker.processTask(task, worker)
          }
        })
        .catch(() => {
          this.taskRequests[tasksChannel] = null

          this.onReadyForNextTasks()
        })
    }
  }

  async onTaskProcessed(task, result) {
    await this.messageBroker.setTaskResult(task, result)

    if (task.getProcessingDuration) {
      logger.debug(
        `[${ task.workerPID }] Task processed in ${ task.getProcessingDuration() }ms`
      )
    }
  }

  exitOnErrorInMessageBroker(error) {
    logger.error('Exist the coderunner because of the error in the MessageBroker: ', error)

    process.exit(1)
  }

  async stop() {
    if (!this.stopped) {
      this.stopped = true

      if (this.messageBroker) {
        await this.messageBroker.stopGetters()
      }

      if (this.workersBroker) {
        await this.workersBroker.stop()
      }

      if (this.messageBroker) {
        await this.messageBroker.stopSetters()
      }

      if (this.stopStatusService) {
        await this.stopStatusService()
      }
    }
  }
}
