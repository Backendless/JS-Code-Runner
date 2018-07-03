'use strict'

const cluster = require('cluster')

module.exports = opts => ({
  start() {
    if (cluster.isMaster) {
      return require('./cloud-master')(opts)
    }

    return require('./cloud-worker')(opts)
  }
})