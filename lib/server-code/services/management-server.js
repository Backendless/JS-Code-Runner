'use strict'

const mainLogger = require('../../util/logger')

exports.start = function startManagementServer(config, workersBroker, messageBroker) {
  const port = config.managementHttpPort

  const logger = mainLogger.winston.createLogger('Server')

  if (!port) {
    logger.info(
      'The server will not start. ' +
      'For running the server option "managementHttpPort" must be specified.'
    )

    return
  }

  const http = require('http')

  const router = async (req, res) => {
    logger.debug(`Received a new requests: ${ req.method } ${ req.url }`)

    res.setHeader('Access-Control-Allow-Origin', '*')

    const isGET = req.method === 'GET'

    if (isGET && req.url === '/health') {
      res.end()
    } else if (isGET && req.url === '/status') {
      res.end(JSON.stringify({
        ...workersBroker.getStats(),
        mainQueue: await messageBroker.getMainQueueLength(),
        lpQueue  : await messageBroker.getLPQueueLength(),
      }))
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
