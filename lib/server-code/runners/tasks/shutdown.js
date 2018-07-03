'use strict'

const logger = require('../../../util/logger')

function shutdown() {
  logger.info('Received a shutdown request from Backendless')

  process.exit(0)
}

module.exports = shutdown