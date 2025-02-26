'use strict'

const argsUtil    = require('./util/args'),
      domain      = require('domain'),
      Backendless = require('backendless'),
      logger      = require('../../../util/logger')

/**
 * @typedef {Object} BlConfigurationItem
 * @property {String} name;
 * @property {String} value;
 * @property {String} productId;
 */

/**
 * @typedef {Object} InvocationContext
 *
 * @property {String} userId;
 * @property {String} userLocale;
 * @property {String} userToken;
 * @property {Array.<String>} userRoles;
 * @property {String} deviceType;
 * @property {String} httpPath;
 * @property {Object.<String, String>} httpHeaders;
 * @property {Object.<String, String>} httpQueryParams;
 * @property {Object.<String, String>} httpPathParams;
 * @property {Array.<BlConfigurationItem>} configurationItems
 */

/**
 * @typedef {CodeRunnerTask} InvokeServiceTask
 * @property {String} serviceId
 * @property {String} className
 * @property {String} method
 * @property {String} provider
 * @property {Array<number>} arguments
 * @property {InvocationContext} invocationContextDto
 * @property {Object.<string, Object>} properties
 */


function truncateNamespace(className) {
  const tokens = className.split('.')

  return tokens[tokens.length - 1]
}

function applyUser(userId, userToken) {
  Backendless.LocalCache.set('stayLoggedIn', true)
  Backendless.LocalCache.set('current-user-id', userToken && userId || null)
  Backendless.LocalCache.set('user-token', userToken || null)
}

/**
 * @param {!InvokeServiceTask} task
 * @param {ServerCodeModel} model
 * @returns {Promise.<*>}
 */
function execute(task, model) {
  logger.info(`[${task.id}] [INVOKE SERVICE] ${task.className}.${task.method}`)

  return new Promise((resolve, reject) => {
    const serviceClassName = truncateNamespace(task.className)
    const service = model.getService(serviceClassName)

    if (!service) {
      throw new Error(`[${serviceClassName}] service does not exist`)
    }

    const args = argsUtil.decode(task.arguments, model.classMappings)
    const context = task.invocationContextDto

    applyUser(context.userId, context.userToken)

    const d = domain.create()
    d.on('error', reject)
    d.run(() => {
      Promise.resolve(service.invokeMethod(task.method, context, args))
        .then(res => (res !== undefined) ? res : null)
        .then(resolve)
        .catch(reject)
    })
  })
}

module.exports = execute
