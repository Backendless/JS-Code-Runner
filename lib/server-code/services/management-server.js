'use strict'

const logger = require('../../util/logger')

exports.start = function startManagementServer(port, workersBroker) {
  if (!port) {
    logger.info(
      'Can not run Management Server. ' +
      'For running the server option "managementHttpPort" must be specified.'
    )

    return
  }

  const http = require('http')

  const router = (request, response) => {
    if (request.method === 'GET') {
      if (request.url === '/health') {
        response.end()
      } else if (request.url === '/stats') {
        response.setHeader('Access-Control-Allow-Origin', '*')
        response.end(JSON.stringify(workersBroker.getStats()))
      } else if (request.url === '/stats/apps') {
        response.setHeader('Access-Control-Allow-Origin', '*')
        response.end(JSON.stringify(workersBroker.getAppsLoad()))
      }
    } else {
      response.statusCode = 404
      response.end(http.STATUS_CODES[response.statusCode])
    }
  }

  const server = http.createServer(router)

  return new Promise((resolve, reject) => {
    function onError(error) {
      error.message = `Can not run Management Server due to exception: ${error.message}`

      reject(error)
    }

    server.on('error', onError)

    logger.info(`Starting Management Server on port:${port}....`)

    server.listen(port, error => {
      if (error) {
        onError(error)
      } else {
        logger.info(`Management Server is listening on http://0.0.0.0:${port}`)

        resolve()
      }
    })
  })
}
