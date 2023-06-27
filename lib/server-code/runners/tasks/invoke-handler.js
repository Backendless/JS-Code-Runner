'use strict'

const domain                    = require('domain'),
      events                    = require('../../events'),
      argsUtil                  = require('./util/args'),
      resultWrapper             = require('./util/result-wrapper'),
      transformResult           = require('./util/result-transformer'),
      logger                    = require('../../../util/logger'),
      Backendless               = require('backendless')

function describeTask(task, event) {
  const timer = event.provider === events.providers.TIMER

  if (timer) {
    return `[${task.id}] [INVOKE TIMER] ${task.target}`
  }

  const args = []
  const custom = event.provider === events.providers.CUSTOM

  if (!custom && event.provider.targeted) {
    args.push(task.target)
  }

  if (task.async) {
    args.push('async')
  }

  let eventDesc = custom ? task.target : event.name

  if (args.length) {
    eventDesc += ` (${args.join(', ')})`
  }

  return `[${task.id}] [INVOKE HANDLER] ${event.provider.id}.${eventDesc}`
}

/**
 * @typedef {CodeRunnerTask} InvokeHandlerTask
 * @property {number} eventId
 * @property {string} target
 * @property {boolean} async
 * @property {String} provider
 * @property {Array.<number>} arguments
 */

/**
 * @param {InvokeHandlerTask} task
 * @param {ServerCodeModel} model
 * @param {Object} opts
 * @returns {Promise.<?Array<number>>}
 */
function execute(task, model, opts) {
  return new Promise((resolve, reject) => {
    const event = events.get(task.eventId)

    if (!event) {
      throw new Error(`Integrity violation. Unknown event id: [${task.eventId}]`)
    }

    logger.info(describeTask(task, event))

    const handler = model.getHandler(task.eventId, task.target)

    if (!handler) {
      throw new Error(`${event.name}(${task.target}) event handler does not exist`)
    }

    const taskArgs = argsUtil.decode(task.arguments, model.classMappings)
    const req = {}, res = {}
    const handlerArgs = [req]

    req.context = taskArgs[0] || {}
    req.context.httpResponseHeaders = task.invocationContextDto.response.headers

    Object.defineProperty(req.context, 'httpResponseStatusCode', {
      set: value => task.invocationContextDto.response.statusCode = value,
      get: () => task.invocationContextDto.response.statusCode,
    })

    applyUser(req.context.userId, req.context.userToken)

    //prepare handler {req}, {res} arguments
    event.args.forEach((name, index) => {
      const arg = taskArgs[index + 1]

      if (name === 'result') {
        res.error = arg && arg.exception
        res.result = arg && arg.result

        handlerArgs.push(res)
      } else {
        req[name] = arg
      }
    })

    if (event.argumentTransformer) {
      event.argumentTransformer.apply(event, handlerArgs)
    }

    function buildResponse(result) {
      if (result !== undefined) {
        result = transformResult(result, event)

        responseSizeCheck(result, opts, event, task)

        req.context.prematureResult = res.result = result
      }

      const wrap = event.resultWrapper || resultWrapper.executionResult

      event.args.forEach((name, index) => {
        taskArgs[index + 1] = (name === 'result')
          ? wrap(res.error, res.result)
          : req[name]
      })

      return taskArgs
    }

    const d = domain.create()
    d.on('error', reject)
    d.run(() => {
      Promise.resolve(handler.invoke.apply(req.context, handlerArgs)).then(
        result => resolve(task.async ? undefined : buildResponse(result)),
        reject)
    })
  })
}

function applyUser(userId, userToken) {
  Backendless.LocalCache.set('stayLoggedIn', true)
  Backendless.LocalCache.set('current-user-id', userToken && userId || null)
  Backendless.LocalCache.set('user-token', userToken || null)
}

function responseSizeCheck(result, opts, event, task) {
  if (opts.responseSizeLimit > 0 && (result.length > opts.responseSizeLimit)) {
    throw new Error(`${event.name}(${task.target}) result size limit exceeded`)
  }
}

module.exports = execute
