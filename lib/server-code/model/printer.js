'use strict'

const logger = require('../../util/logger'),
      events = require('../events')

function describeHandler(handler) {
  const event = events.get(handler.eventId)
  const provider = event.provider
  const custom = provider === events.providers.CUSTOM
  const args = []

  if (!custom && provider.targeted) {
    args.push(handler.target)
  }

  if (handler.async) {
    args.push('async')
  }

  const eventName = custom ? handler.target : event.name
  const argsString = args.length ? `(${args.join(', ')})` : ''

  return `${event.provider.id}.${eventName} ${argsString} (${handler.provider})`
}

function describeTimer(timer) {
  return `${timer.name} (${timer.provider})`
}

function describeError(error) {
  const posSuffix = error.position ? ':' + error.position : ''

  return `${error.message} (${error.erredFile}${posSuffix})`
}

function describeCustomType(type) {
  return `${type.name} (${type.provider})`
}

function printGroup(groupName, items, itemDescriptor) {
  if (items.length) {
    logger.info(`${groupName} (${items.length}):`)
    items.forEach(item => logger.info(`  ${itemDescriptor(item)}`))
  }
}

/**
 * @param {ServerCodeModel} model
 */
exports.print = function(model) {
  printGroup('Event handlers', model.handlers.values(), describeHandler)
  printGroup('Timers', model.timers.values(), describeTimer)
  printGroup('Custom Types', model.types.values(), describeCustomType)
  printGroup('Services', model.services.values(), describeCustomType)
  printGroup('Errors', model.errors, describeError)
}