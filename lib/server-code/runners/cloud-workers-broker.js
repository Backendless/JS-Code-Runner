'use strict'

const cluster = require('cluster')
const EventEmitter = require('events')
const OS = require('os')
const path = require('path')
const ServerCodeEvents = require('../events')

const logger = require('../../util/logger')
const LongWaiter = require('../../util/long-waiter')

const WORKER_TEARDOWN_TIME = 2000 //2 seconds
const WARN_STATUS_TIMEOUT = 5000 //5 seconds

const Events = {
  READY_FOR_NEXT_TASK: 'READY_FOR_NEXT_TASK',
  TASK_PROCESSED     : 'TASK_PROCESSED',
}

const Status = {
  CRITICAL: 'critical',
  WARNING : 'warning',
  GOOD    : 'good',
}

const StatusThresholds = {
  [Status.CRITICAL]: 0.9,
  [Status.WARNING] : 0.7,
}

class WorkersBroker extends EventEmitter {
  constructor(options, codeRunnerOptions) {
    super()

    cluster.setupMaster({
      exec  : path.resolve(__dirname, './cloud-worker.js'),
      args  : [],
      silent: !!logger.winston
    })

    this.status = Status.GOOD

    this.WORKER_RUN_OPTIONS = JSON.stringify(codeRunnerOptions)

    this.options = options

    this.rateLimit = codeRunnerOptions.rateLimit

    this.defaultHeartbeatTimeout = this.options.heartbeat.timeout * 1000
    this.codeInspectionHeartbeatTimeout = this.options.heartbeat.codeInspectionTimeout * 1000

    this.concurrentWorkersLimit = this.options.concurrent || OS.cpus().length

    this.minIdleWorkersCount = this.options.minIdle || 0
    this.minIdleWorkersCount = Math.max(this.minIdleWorkersCount, 0)
    this.minIdleWorkersCount = Math.min(this.minIdleWorkersCount, this.concurrentWorkersLimit)

    if (this.options.cache) {
      if (this.options.cache === true) {
        this.options.cache = { limit: 4 * this.concurrentWorkersLimit }
      }

      this.cachedWorkersLimit = this.options.cache.limit

      if (this.options.cachedIdleTTL) {
        this.cachedWorkersIdleTTL = this.options.cachedIdleTTL * 1000
      }
    }

    this.startingWorkersCount = 0

    this.idleWorkers = []
    this.cachedWorkers = []
    this.busyWorkers = []

    this.appsLoad = {}

    cluster.on('exit', this.onWorkerExit.bind(this))
    cluster.on('message', this.onWorkerMessage.bind(this))

    this.keepMinIdleWorkersCount()

    this.startWorkersHeartbeatTimer()
    this.startStatusWatcher()
  }

  keepMinIdleWorkersCount() {
    const wantingWorkersCount = this.minIdleWorkersCount - this.idleWorkers.length
    const allowedWorkersCount = this.concurrentWorkersLimit - this.getStartedWorkersCount()
    const requiredWorkersCount = Math.min(wantingWorkersCount, allowedWorkersCount) - this.startingWorkersCount

    if (requiredWorkersCount > 0) {
      for (let i = 0; i < requiredWorkersCount; i++) {
        this.startNewWorker()
      }
    }
  }

  async stop() {
    clearInterval(this.statusWatcherTimer)

    logger.info('Wait until each worker finished processing its current task')

    this.stopper = new LongWaiter(() => {
      logger.info(`remains ${ this.busyWorkers.length } busy workers`)

      return !this.busyWorkers.length
    })

    await this.stopper.wait()

    logger.info('pull of the busy workers is empty')
  }

  isCacheEnabled() {
    return !!this.cachedWorkersLimit
  }

  startWorkersHeartbeatTimer() {
    setInterval(() => {
      getAllWorkers().forEach(worker => {
        const heartbeatTimeout = this.getWorkerHeartbeatTimeout(worker)

        if (worker.heartbeat + heartbeatTimeout < Date.now()) {
          this.killWorker(worker, (
            `Worker expired due to heartbeat timeout (${ heartbeatTimeout }ms), ` +
            `the last ping was ${ timeFromLastPing(worker) }ms ago` +
            ` [${ getKilledWorkerDetails(worker) }]`
          ))
        }
      })
    }, this.defaultHeartbeatTimeout)
  }

  getWorkerHeartbeatTimeout(worker) {
    if (worker.task && worker.task.actionType === 'ANALYSE_SERVER_CODE') {
      return this.codeInspectionHeartbeatTimeout
    }

    return this.defaultHeartbeatTimeout
  }

  updateStatus() {
    const currentWorkersLoad = this.getCurrentLoad()

    if (currentWorkersLoad > StatusThresholds[Status.CRITICAL]) {
      this.status = Status.CRITICAL
    } else if (currentWorkersLoad > StatusThresholds[Status.WARNING]) {
      this.status = Status.WARNING
    } else {
      this.status = Status.GOOD
    }
  }

  startStatusWatcher() {
    let delayShowingMessage = null

    this.statusWatcherTimer = setInterval(() => {
      this.updateStatus()

      if (this.status !== Status.GOOD) {
        if (delayShowingMessage) {
          const startedTimeAgo = Date.now() - delayShowingMessage

          if (startedTimeAgo > WARN_STATUS_TIMEOUT) {
            logger.warn(
              `CodeRunner status is [${ this.status }] ` +
              `started ${ parseInt(startedTimeAgo / 1000) } seconds ago ${ JSON.stringify(this.getStats()) }`
            )
          }
        } else {
          delayShowingMessage = Date.now()
        }
      } else {
        delayShowingMessage = null
      }
    }, 1000)
  }

  async startNewWorker() {
    const time = timeMarker()

    this.startingWorkersCount++

    const worker = cluster.fork({
      RUN_OPTIONS: this.WORKER_RUN_OPTIONS
    })

    worker.heartbeat = Date.now()

    try {
      await new Promise(resolve => {
        function onMessageFromWorker(message) {
          if (message === 'started') {
            worker.process.removeListener('message', onMessageFromWorker)

            resolve()
          }
        }

        worker.process.on('message', onMessageFromWorker)

        if (logger.winston && !logger.ignoreWorkersLog) {
          worker.process.stdout
            .pipe(logger.winston.createLogStream('info'))
            .pipe(logger.winston)

          worker.process.stderr
            .pipe(logger.winston.createLogStream('error'))
            .pipe(logger.winston)
        }
      })

      worker.startedIn = time()

      logger.info(`[${ worker.process.pid }] Worker started in ${ worker.startedIn }`)

      this.relocateWorker(worker, this.idleWorkers)

    } catch (error) {
      this.killWorker(worker, error.message)
    }

    this.startingWorkersCount--
  }

  processTask(task, worker) {
    if (task.timeout) {
      this.createExpirationTimer(worker, task.timeout)
    }

    if (!this.isCacheEnabled()) {
      task.cacheable = false
    }

    task.workerPID = worker.process.pid

    worker.task = task
    worker.process.send({ task })

    delete worker.startIdlingTime

    this.relocateWorker(worker, this.busyWorkers)
  }

  createExpirationTimer(worker, timeout) {
    worker.expireTimer = setTimeout(() => {
      this.killWorker(worker, `Worker expired due to task timeout (${ timeout }ms)`)
    }, timeout + WORKER_TEARDOWN_TIME)
  }

  destroyExpirationTimer(worker) {
    if (worker.expireTimer) {
      clearTimeout(worker.expireTimer)

      delete worker.expireTimer
    }
  }

  createIdlingTimer(worker) {
    if (this.cachedWorkersIdleTTL) {
      worker.startIdlingTime = Date.now()

      worker.idlingTimer = setInterval(() => {
        if (this.cachedWorkers.length > this.minIdleWorkersCount) {
          const idlingTime = Math.floor((Date.now() - worker.startIdlingTime) / 1000)

          this.killWorker(
            worker,
            `Destroy the cached worker because if was idling more than ${ idlingTime } seconds`
          )

          logger.info(`After killing cached idle worker... (${ this.getStatsString() })`)
        }
      }, this.cachedWorkersIdleTTL)
    }
  }

  destroyIdlingTimer(worker) {
    if (worker.idlingTimer) {
      clearTimeout(worker.idlingTimer)

      delete worker.idlingTimer
    }

    delete worker.startIdlingTime
  }

  getCurrentLoad() {
    return this.busyWorkers.length / this.concurrentWorkersLimit
  }

  getAvailableWorkersCount() {
    return this.concurrentWorkersLimit - this.busyWorkers.length
  }

  isAppRateLimitReached(appId) {
    if (!this.rateLimit.enabled) {
      return false
    }

    const limit = this.getAppRateLimit(appId)
    const current = this.appsLoad[appId]
    const isReached = current >= limit

    logger[isReached ? 'info' : 'debug'](
      `Rate limit for app ${ appId } ${ isReached ? 'is' : 'is not' } reached, current=${ current }, limit=${ limit }`
    )

    return isReached
  }

  getAppRateLimit(appId) {
    if (this.rateLimit.overrides[appId]) {
      return this.rateLimit.overrides[appId]
    }

    return this.rateLimit.default
  }

  getStartedWorkersCount() {
    return Object.keys(cluster.workers).length
  }

  async getWorkerForTask(appId, isTaskCacheable) {
    const isCacheEnabled = this.isCacheEnabled()

    if (isCacheEnabled && isTaskCacheable) {
      const cachedWorker = this.cachedWorkers.find(worker => worker.appId === appId)

      if (cachedWorker) {
        return cachedWorker
      }
    }

    const idleWorker = this.idleWorkers.pop()

    if (idleWorker) {
      if (isTaskCacheable) {
        idleWorker.appId = appId
      }

      return idleWorker
    }

    if (isCacheEnabled && this.cachedWorkersLimit <= this.cachedWorkers.length) {
      const leastActiveWorker = this.cachedWorkers.pop()

      if (leastActiveWorker) {
        this.killWorker(leastActiveWorker, 'Killed the least active cached worker, because cached pool is full')
      }
    }

    await this.startNewWorker()

    return this.getWorkerForTask(appId, isTaskCacheable)
  }

  relocateWorker(worker, newPlace) {
    const oldPlace = worker.currentPlace

    const fromBusyWorkers = oldPlace === this.busyWorkers
    const toBusyWorkers = newPlace === this.busyWorkers
    const toCachedWorkers = newPlace === this.cachedWorkers

    const fromIdleWorkers = oldPlace === this.idleWorkers
    const fromCachedWorkers = oldPlace === this.cachedWorkers

    if (toCachedWorkers) {
      this.createIdlingTimer(worker)
    } else if (fromCachedWorkers) {
      this.destroyIdlingTimer(worker)
    }

    if (oldPlace) {
      const index = oldPlace.indexOf(worker)

      if (index !== -1) {
        oldPlace.splice(index, 1)
      }
    }

    worker.currentPlace = newPlace

    if (newPlace) {
      newPlace.unshift(worker)
    }

    if (fromBusyWorkers || toBusyWorkers) {
      this.appsLoad[worker.appId] = (this.appsLoad[worker.appId] || 0)
      this.appsLoad[worker.appId] += (toBusyWorkers ? 1 : -1)

      if (this.stopper) {
        this.stopper.check()
      }

      if (this.isAvailableForTaskPrecessing()) {
        setImmediate(() => {
          this.emit(Events.READY_FOR_NEXT_TASK)
        })
      }
    }

    if (!this.stopper && (fromIdleWorkers || fromBusyWorkers || toBusyWorkers)) {
      this.keepMinIdleWorkersCount()
    }
  }

  isAvailableForTaskPrecessing() {
    return !this.stopper && this.busyWorkers.length < this.concurrentWorkersLimit
  }

  killAllAppWorkers(appId, reason) {
    const workers = getAllWorkers()

    workers.forEach(worker => {
      if (worker.appId === appId) {
        worker.toBeRemoved = true
        worker.toBeRemovedReason = reason
      }
    })

    this.cachedWorkers.forEach(worker => {
      if (worker.appId === appId) {
        this.killWorker(worker, reason)
      }
    })
  }

  killWorker(worker, reason) {
    this.relocateWorker(worker)

    if (logger.winston && !logger.ignoreWorkersLog) {
      worker.process.stdout.unpipe()
      worker.process.stderr.unpipe()
    }

    worker.killed = true

    // we use this instead of worker.kill(...) because we do not need to stop it gracefully
    worker.process.kill('SIGKILL')

    logger.info(`[${ worker.process.pid }] Worker killed.`, reason || '')
  }

  getStats() {
    const started = this.getStartedWorkersCount()

    return {
      status   : this.status,
      load     : `${ parseInt(this.getCurrentLoad() * 10000) / 100 }%`,
      busy     : this.busyWorkers.length,
      available: this.getAvailableWorkersCount(),
      started,
      starting : this.startingWorkersCount,
      idle     : this.idleWorkers.length,
      cached   : this.cachedWorkers.length,
      limit    : this.concurrentWorkersLimit,
      total    : started, // for legacy purposes
      appsLoad : this.appsLoad,
    }
  }

  getAppsLoad() {
    const result = {}

    Object
      .keys(this.appsLoad)
      .map(appId => ([appId, this.appsLoad[appId]]))
      .sort((a, b) => (a[1] - b[1]))
      .forEach(([appId, value]) => (result[appId] = value))

    return result
  }

  getStatsString() {
    const { load, busy, available, started, starting, idle, cached, limit } = this.getStats()

    return (
      `load: ${ load }, ` +
      `busy: ${ busy }, ` +
      `available: ${ available }, ` +
      `started: ${ started }, ` +
      `starting: ${ starting }, ` +
      `idle: ${ idle }, ` +
      (this.isCacheEnabled() ? `cached: ${ cached }, ` : '') +
      `limit: ${ limit } `
    )
  }

  onWorkerMessage(worker, message) {
    if (message.processed) {
      this.onWorkerTaskProcessed(worker, message)

    } else if (message.criticalError) {
      worker.toBeRemoved = true
      worker.toBeRemovedReason = `The worker has been failed with a critical error: ${ message.criticalError }`

    } else if (message === 'idling') {
      if (worker.task.cacheable && !worker.toBeRemoved) {
        delete worker.task

        this.onWorkerIdling(worker)
      } else {
        this.killWorker(worker, worker.toBeRemovedReason)
      }

    } else if (message === 'heartbeat') {
      this.onWorkerHeartbeat(worker)
    }
  }

  onWorkerTaskProcessed(worker, message) {
    const task = worker.task
    const taskResult = message.taskResult

    this.emit(Events.TASK_PROCESSED, task, taskResult)
  }

  onWorkerIdling(worker) {
    this.destroyExpirationTimer(worker)

    this.relocateWorker(worker, this.cachedWorkers)
  }

  onWorkerHeartbeat(worker) {
    worker.heartbeat = Date.now()
  }

  onWorkerExit(worker) {
    this.destroyExpirationTimer(worker)

    if (!worker.exitedAfterDisconnect && !worker.killed) {
      logger.info(`[${ worker.process.pid }] Worker exited`)

      this.relocateWorker(worker)
    }
  }
}

function getAllWorkers() {
  return Object.keys(cluster.workers).map(id => cluster.workers[id])
}

function timeMarker() {
  const time = process.hrtime()

  return () => {
    const duration = process.hrtime(time)
    const ms = duration[0] * 1000 + duration[1] / 1e6

    return `${ ms.toFixed(3) }ms`
  }
}

function getKilledWorkerDetails(worker) {
  const { appId, task } = worker

  const details = [`appId: ${ appId }`]

  if (task) {
    if (task.deploymentModelName) {
      details.push(`model: ${ task.deploymentModelName }`)
    }

    if (task.className) {
      const service = task.className.replace('services.', '')
      details.push(`service: ${ service }`)
    }

    if (task.method) {
      details.push(`method: ${ task.method }`)
    }

    if (task.eventId) {
      const event = ServerCodeEvents.get(task.eventId)

      details.push(`handler: ${ event.provider.id }(${ event.provider.id === 'timer' ? task.target : event.name })`)
    }

    if (task.provider) {
      details.push(`file-path: ${ task.provider }`)
    }
  }

  return details.join(', ')
}

function timeFromLastPing(worker) {
  return worker.heartbeat && Date.now() - worker.heartbeat
}

WorkersBroker.Events = Events

module.exports = WorkersBroker



