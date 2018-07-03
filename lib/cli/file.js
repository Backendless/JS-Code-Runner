'use strict'

const path = require('path')
const fs = require('fs')
const logger = require('../util/logger')

const CONFIG_FILE = './coderunner.json'

module.exports = function getOptionsFromConfigurationFile(file) {
  if (!file) {
    if (fs.existsSync(CONFIG_FILE)) {
      file = CONFIG_FILE
    } else {
      file = `${__dirname}/../../bin/${CONFIG_FILE}`
    }
  }

  file = path.resolve(file)

  logger.debug(`Using configuration stored in ${file} `)

  try {
    return require(file)
  } catch (e) {
    logger.error(`Warning. Unable to read config file [${file}]`)

    throw e
  }
}