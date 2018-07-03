'use strict'

const DEFAULT_WORKERS_HEARTBEAT_INTERVAL = 5
const DEFAULT_WORKERS_HEARTBEAT_TIMEOUT = 10

module.exports = function enrichWithDefaults(options) {
  options.workersHeartbeat = {}
  options.backendless = options.backendless || {}
  options.backendless.msgBroker = options.backendless.msgBroker || {}

  options.workersHeartbeat.interval = options.workersHeartbeat.interval || DEFAULT_WORKERS_HEARTBEAT_INTERVAL
  options.workersHeartbeat.timeout = options.workersHeartbeat.timeout || DEFAULT_WORKERS_HEARTBEAT_TIMEOUT

  return options
}
