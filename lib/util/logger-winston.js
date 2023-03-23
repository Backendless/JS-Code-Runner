const stream = require('stream')

const { createLogger, activateLogger } = require('backendless-js-services-core/lib/logger')

class LogStream extends stream.Transform {
  constructor({ level }) {
    super({
      readableObjectMode: true,
      writableObjectMode: true
    })

    this.level = level || 'info'
  }

  _transform(chunk, encoding, callback) {
    callback(null, {
      level  : this.level,
      message: chunk.slice(0, -1) // remove the last char "\n" from workers stdout/stderr
    })
  }
}

module.exports = function createWinstonLogger(loggersConfig) {
  activateLogger(loggersConfig)

  const logger = createLogger(null, {
    formatComposer: format => format.printf(({ message }) => message)
  })

  logger.createLogger = createLogger
  logger.createLogStream = level => new LogStream({ level })

  return logger
}
