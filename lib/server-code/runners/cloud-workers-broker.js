'use strict'

const cluster = require('cluster')
const EventEmitter = require('events')
const OS = require('os')
const path = require('path')

const logger = require('../../util/logger')

const WORKER_TEARDOWN_TIME = 10000 //10 seconds

const Events = {
  READY_FOR_NEXT_TASK: 'READY_FOR_NEXT_TASK',
  TASK_PROCESSED     : 'TASK_PROCESSED',
}

class WorkersBroker extends EventEmitter {
  constructor(options, workerRunOptions) {
    super()

    cluster.setupMaster({
      exec: path.resolve(__dirname, './cloud-worker.js'),
      args: []
    })

    this.workerRunOptions = workerRunOptions

    this.options = options

    this.heartbeatTimeout = this.options.heartbeat.timeout * 1000

    this.concurrentWorkersLimit = this.options.concurrent || OS.cpus().length

    if (this.options.cache) {
      if (this.options.cache === true) {
        this.options.cache = { limit: 4 * this.concurrentWorkersLimit }
      }

      this.cachedWorkersLimit = this.options.cache.limit
    }

    this.idleWorkers = []
    this.cachedWorkers = []
    this.busyWorkers = []

    cluster.on('exit', this.onWorkerExit.bind(this))
    cluster.on('message', this.onWorkerMessage.bind(this))

    this.startWorkersHeartbeatTimer()
  }

  isCacheEnabled() {
    return !!this.cachedWorkersLimit
  }

  startWorkersHeartbeatTimer() {
    setInterval(() => {
      getAllWorkers().forEach(worker => {
        if (worker.heartbeat + this.heartbeatTimeout < Date.now()) {
          this.killWorker(worker, `Worker expired due to heartbeat timeout (${this.heartbeatTimeout}ms)`)
        }
      })
    }, this.heartbeatTimeout)
  }

  async startNewWorker() {
    const time = timeMarker()

    const worker = cluster.fork({
      RUN_OPTIONS: JSON.stringify(this.workerRunOptions)
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
      })

      logger.info(`[${worker.process.pid}] Worker started in ${time()}`)

      this.relocateWorker(worker, this.idleWorkers)

    } catch (error) {
      this.killWorker(worker, error.message)
    }
  }

  processTask(task, worker) {
    if (task.timeout) {
      worker.expireTimer = this.createExpirationTimer(worker, task.timeout)
    }

    if (!this.isCacheEnabled()) {
      task.cacheable = false
    }

    worker.task = task
    worker.process.send({ task })

    this.relocateWorker(worker, this.busyWorkers)
  }

  createExpirationTimer(worker, timeout) {
    return setTimeout(() => {
      this.killWorker(worker, `Worker expired due to task timeout (${timeout}ms)`)
    }, timeout + WORKER_TEARDOWN_TIME)
  }

  destroyExpirationTimer(worker) {
    if (worker.expireTimer) {
      clearTimeout(worker.expireTimer)

      delete worker.expireTimer
    }
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

    if (oldPlace === this.busyWorkers || newPlace === this.busyWorkers) {
      if (this.isAvailableForTaskPrecessing()) {
        setImmediate(() => {
          this.emit(Events.READY_FOR_NEXT_TASK)
        })
      }
    }
  }

  isAvailableForTaskPrecessing() {
    return this.busyWorkers.length < this.concurrentWorkersLimit
  }

  killAllAppWorkers(appId, reason) {
    const workers = getAllWorkers()

    workers.forEach(worker => {
      if (worker.appId === appId) {
        this.killWorker(worker, reason)
      }
    })
  }

  killWorker(worker, reason) {
    logger.info(`[${worker.process.pid}] Worker killed.`, reason || '')

    this.relocateWorker(worker)

    worker.killed = true
    worker.process.kill('SIGKILL')
  }

  getStats() {
    return {
      idle  : this.idleWorkers.length,
      cached: this.cachedWorkers.length,
      busy  : this.busyWorkers.length,
      total : Object.keys(cluster.workers).length,
    }
  }

  onWorkerMessage(worker, message) {
    if (message.processed) {
      this.onWorkerTaskProcessed(worker, message)

    } else if (message === 'idling') {
      this.onWorkerIdling(worker)

    } else if (message === 'heartbeat') {
      this.onWorkerHeartbeat(worker)
    }
  }

  onWorkerTaskProcessed(worker, message) {
    const task = worker.task
    const taskResult = message.taskResult

    this.destroyExpirationTimer(worker)

    delete worker.task

    this.emit(Events.TASK_PROCESSED, task, taskResult)

    if (!task.cacheable) {
      this.killWorker(worker)
    }
  }

  onWorkerIdling(worker) {
    this.relocateWorker(worker, this.cachedWorkers)
  }

  onWorkerHeartbeat(worker) {
    worker.heartbeat = Date.now()
  }

  onWorkerExit(worker) {
    this.destroyExpirationTimer(worker)

    if (!worker.exitedAfterDisconnect && !worker.killed) {
      logger.info(`[${worker.process.pid}] Worker exited`)

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

    return `${ms.toFixed(3)}ms`
  }
}

WorkersBroker.Events = Events

module.exports = WorkersBroker


