'use strict'

const cluster = require('cluster')

async function buildMasterOptions(appRequired, repoPathRequired) {
  const program = require('commander')

  const getOptionsFromConfigurationFile = require('./file')
  const enrichWithDefaults = require('./defaults')
  const enrichWithConsul = require('./consul')
  const enrichWithENV = require('./env')
  const enrichWithProgramArguments = require('./program')

  const options = await getOptionsFromConfigurationFile(program.config)

  await enrichWithDefaults(options)
  await enrichWithConsul(options)
  await enrichWithENV(options)
  await enrichWithProgramArguments(options, appRequired, repoPathRequired)

  return options
}

module.exports = async function getRunOptions(appRequired, repoPathRequired) {
  const REQUEST_RUN_OPTIONS_PROCESS_EVENT = 'REQUEST_RUN_OPTIONS_PROCESS_EVENT'
  const RECEIVE_RUN_OPTIONS_PROCESS_EVENT = 'RECEIVE_RUN_OPTIONS_PROCESS_EVENT'

  if (cluster.isMaster) {
    const options = await buildMasterOptions(appRequired, repoPathRequired)

    cluster.on('message', (worker, message) => {
      if (message.type === REQUEST_RUN_OPTIONS_PROCESS_EVENT) {
        worker.process.send({ type: RECEIVE_RUN_OPTIONS_PROCESS_EVENT, options })
      }
    })

    return options
  }

  return new Promise(resolve => {
    process.on('message', onMessageFromMaster)
    process.send({ type: REQUEST_RUN_OPTIONS_PROCESS_EVENT })

    function onMessageFromMaster(message) {
      if (message.type === RECEIVE_RUN_OPTIONS_PROCESS_EVENT) {
        resolve(message.options)

        process.removeListener('message', onMessageFromMaster)
      }
    }
  })
}




