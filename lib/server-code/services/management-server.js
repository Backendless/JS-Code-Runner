'use strict'

const logger = require('../../util/logger')

exports.start = function startManagementServer(options) {
  const port = options.backendless.managementHttpPort

  if (!port) {
    logger.info(
      'Can not run Management Server.\n' +
      'For running the server option "backendless.managementHttpPort" must be specified.'
    )

    return
  }

  const http = require('http')

  const router = (request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.end()
    } else {
      response.statusCode = 404
      response.end(http.STATUS_CODES[response.statusCode])
    }
  }

  const server = http.createServer(router)

  server.listen(port, error => {
    if (error) {
      logger.error('Can not run Management Server due to exception:', error)

    } else {
      logger.info(`Management Server is listening on http://0.0.0.0:${port}`)
    }
  })
}
