'use strict'

require('should')

const EventEmitter = require('events')
const WorkersBroker = require('../lib/server-code/runners/cloud-workers-broker')

require('mocha')

const { TASK_PROCESSED } = WorkersBroker.Events

// builds the broker without its constructor, which forks workers and starts timers
function createBroker() {
  const broker = Object.create(WorkersBroker.prototype)

  EventEmitter.call(broker)

  Object.assign(broker, {
    options               : {},
    concurrentWorkersLimit: 1,
    minIdleWorkersCount   : 0,
    startingWorkersCount  : 0,
    idleWorkers           : [],
    cachedWorkers         : [],
    busyWorkers           : [],
    appsLoad              : {},
  })

  broker.processed = []
  broker.on(TASK_PROCESSED, (task, taskResult) => broker.processed.push({ task, taskResult }))

  return broker
}

function createWorker() {
  return {
    process: {
      pid : 1,
      kill: () => undefined,
      send: () => undefined,
    }
  }
}

function startTask(broker, worker) {
  const task = { id: 'task-id', responseChannelId: 'response-channel' }

  broker.processTask(task, worker)

  return task
}

describe('[cloud-workers-broker] unprocessed task', function() {
  it('should publish an error result when a busy worker is killed', function() {
    const broker = createBroker()
    const worker = createWorker()
    const task = startTask(broker, worker)

    broker.killWorker(worker, 'Worker expired due to task timeout (1000ms)')

    broker.processed.should.have.length(1)
    broker.processed[0].task.should.equal(task)

    const result = JSON.parse(broker.processed[0].taskResult)

    result.requestId.should.equal(task.id)
    result.exception.exceptionMessage.should.equal(
      'Task execution was terminated. Worker expired due to task timeout (1000ms)'
    )
  })

  it('should publish an error result when a busy worker exits unexpectedly', function() {
    const broker = createBroker()
    const worker = createWorker()

    startTask(broker, worker)

    broker.onWorkerExit(worker, null, 'SIGABRT')

    broker.processed.should.have.length(1)

    JSON.parse(broker.processed[0].taskResult).exception.exceptionMessage.should.equal(
      'Task execution was terminated. Worker exited unexpectedly (code: null, signal: SIGABRT)'
    )
  })

  it('should not publish a second result when the worker has already sent its result', function() {
    const broker = createBroker()
    const worker = createWorker()

    startTask(broker, worker)

    broker.onWorkerMessage(worker, { processed: true, taskResult: 'result' })
    broker.onWorkerMessage(worker, 'idling')
    broker.onWorkerExit(worker, null, 'SIGKILL')

    broker.processed.should.have.length(1)
    broker.processed[0].taskResult.should.equal('result')
  })

  it('should publish the error result only once when the killed worker exits', function() {
    const broker = createBroker()
    const worker = createWorker()

    startTask(broker, worker)

    broker.killWorker(worker, 'Worker expired due to task timeout (1000ms)')
    broker.onWorkerExit(worker, null, 'SIGKILL')

    broker.processed.should.have.length(1)
  })

  it('should not publish anything when a worker without a task is killed', function() {
    const broker = createBroker()
    const worker = createWorker()

    broker.killWorker(worker, 'Killed the least active cached worker, because cached pool is full')

    broker.processed.should.be.empty()
  })
})
