const { activateStatus } = require('backendless-js-services-core/lib/status')
const { RedisClient } = require('backendless-js-services-core/lib/redis')

const logger = require('../../util/logger')

module.exports = function initStatusService(options) {
  if (options.serviceStatus) {
    const statusService = activateStatus({
      name  : 'js-coderunner',
      port  : options.managementHttpPort,
      redis : new RedisClient('status', options.redis.analytics, { logger }),
      logger: logger.winston.createLogger('Status'),
    })

    return function stop() {
      statusService.stop()
    }
  }
}
