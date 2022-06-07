'use strict'

exports.start = function startManagementServer(config, workersBroker) {
  const port = config.managementHttpPort
  const useDebugLogger = config.loggers.managementServer

  const logger = createOwnLogger(useDebugLogger)

  if (!port) {
    logger.info(
      'The server will not start. ' +
      'For running the server option "managementHttpPort" must be specified.'
    )

    return
  }

  const http = require('http')

  const router = (req, res) => {
    logger.debug(`Received a new requests: ${ req.method } ${ req.url }`)

    res.setHeader('Access-Control-Allow-Origin', '*')

    const isGET = req.method === 'GET'

    if (isGET && req.url === '/health') {
      res.end()
    } else if (isGET && req.url === '/stats') {
      res.end(JSON.stringify(workersBroker.getStats()))
    } else if (isGET && req.url === '/stats/apps') {
      res.end(JSON.stringify(workersBroker.getAppsLoad()))
    } else {
      res.statusCode = 404
      res.end()
    }

    logger.debug(
      `Sent response for request: ${ req.method } ${ req.url }; ` +
      `statusCode="${ res.statusCode }" statusMessage="${ res.statusMessage }"`
    )
  }

  const server = http.createServer(router)

  return new Promise((resolve, reject) => {
    function onError(error) {
      error.message = `Can not run the server due to exception: ${ error.message }`

      reject(error)
    }

    server.on('error', onError)

    logger.info(`Starts listening on port:${ port }....`)

    server.listen(port, error => {
      if (error) {
        onError(error)
      } else {
        logger.info(`started http://0.0.0.0:${ port }`)

        resolve()
      }
    })
  })
}

function createOwnLogger(useDebugLogger) {
  const mainLogger = require('../../util/logger')

  return {
    info : m => mainLogger.info(`[HTTP Management Server] ${ m }`),
    error: m => mainLogger.error(`[HTTP Management Server] ${ m }`),
    debug: useDebugLogger ? m => mainLogger.debug(`[HTTP Management Server] ${ m }`) : _ => _
  }
}
