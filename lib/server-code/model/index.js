'use strict'

const ServerCode     = require('../api'),
      events         = require('../events'),
      ServiceWrapper = require('./service'),
      printer        = require('./printer'),
      jsdoc          = require('../../util/jsdoc'),
      logger         = require('../../util/logger')

//Duplicate strategies
const REJECT = 'reject'
const IGNORE = 'ignore'
const MERGE_TO_FRONT = 'merge_to_front'
const MERGE_TO_BACK = 'merge_to_back'
const REPLACE = 'replace'

class Dictionary {
  keys() {
    return Object.keys(this)
  }

  values() {
    return this.keys().map(key => this[key])
  }
}

class Definitions {
  constructor() {
    this.files = []
    this.types = {}
  }

  setExplicitly(definitions) {
    this.explicit = true

    this.files = definitions && definitions.files || []
    this.types = definitions && definitions.types || []
  }

  addFile(file, options) {
    const strategy = options && options.duplicateStrategy || REPLACE

    if (!this.explicit && this.files.indexOf(file.relativePath) === -1) {
      this.files.push(file.relativePath)

      const foundClasses = jsdoc.describeClasses(file.absolutePath)
      foundClasses.forEach(classDef => {
        const existing = this.types[classDef.name]

        if (!existing || strategy === REPLACE) {
          this.types[classDef.name] = classDef
        } else {
          Object.keys(classDef.properties).forEach(property => {
            if (!existing.properties[property] || strategy === MERGE_TO_FRONT) {
              existing.properties[property] = classDef.properties[property]
            }
          })

          Object.keys(classDef.methods).forEach(method => {
            if (!existing.methods[method] || strategy === MERGE_TO_FRONT) {
              existing.methods[method] = classDef.methods[method]
            }
          })
        }
      })
    }
  }
}

class ServerCodeModel {
  constructor() {
    this.types = new Dictionary()
    this.handlers = new Dictionary()
    this.timers = new Dictionary()
    this.services = new Dictionary()
    this.definitions = new Definitions()
    this.errors = []
  }

  addHandler(handler) {
    const key = ServerCodeModel.computeHandlerKey(handler.eventId, handler.target)

    if (this.handlers[key]) {
      const methodName = events.get(handler.eventId).name

      throw new Error(`[${methodName}(${handler.target})] event handler already exists`)
    }

    this.handlers[key] = handler
  }

  addTimer(timer) {
    if (this.timers[timer.name]) {
      throw new Error(`[${timer.name}] timer already exists`)
    }

    this.timers[timer.name] = timer
  }

  getHandler(eventId, target) {
    const isTimer = events.get(eventId).provider === events.providers.TIMER

    return isTimer
      ? this.timers[target]
      : this.handlers[ServerCodeModel.computeHandlerKey(eventId, target)]
  }

  getService(serviceName) {
    return this.services[serviceName]
  }

  addService(service, file, options) {
    const strategy = options && options.duplicateStrategy || REJECT
    this.definitions.addFile(file, options)

    if (!service.description) {
      const serviceDef = this.definitions.types[service.name]

      if (serviceDef) {
        service.description = serviceDef.description
      }
    }

    const serviceWrapper = new ServiceWrapper(service, file.relativePath, this)

    const isDuplicate = !!this.services[serviceWrapper.name]

    if (isDuplicate) {
      if (strategy === REJECT) {
        throw new Error(`[${serviceWrapper.name}] service already exists`)
      }

      if (strategy === IGNORE) {
        return
      }
    }

    this.services[serviceWrapper.name] = serviceWrapper
  }

  /**
   * @param {String} type
   * @param {String} file
   * @param {{duplicateStrategy:String}}options
   */
  addType(type, file, options) {
    const strategy = options && options.duplicateStrategy || REJECT
    const isDuplicate = !!this.types[type.name]

    if (isDuplicate) {
      if (strategy === REJECT) {
        throw new Error(`[${type.name}] custom type already exists`)
      }

      if (strategy === IGNORE) {
        return
      }
    }

    this.definitions.addFile(file, options)

    if (!isDuplicate || strategy !== MERGE_TO_BACK) {
      this.types[type.name] = { name: type.name, clazz: type, provider: file.relativePath }
    }
  }

  addError(error, serverCodeFile, erredFile) {
    this.errors.push({
      message : error.message,
      position: error.position,
      serverCodeFile,
      erredFile
    })
  }

  get classMappings() {
    const result = {}

    Object.keys(this.types).forEach(name => {
      result[name] = this.types[name].clazz
    })

    return result
  }

  print() {
    printer.print(this)
  }

  toJSON() {
    return {
      handlers   : this.handlers.values(),
      timers     : this.timers.values(),
      services   : this.services.values(),
      definitions: this.definitions,
      types      : this.types,
      errors     : this.errors
    }
  }

  loadFiles(basePath, exclude, files) {
    ServerCode.load(basePath, exclude, this, files)
  }

  isEmpty() {
    return this.handlers.values().length === 0
      && this.services.values().length === 0
      && this.timers.values().length === 0
  }

  static computeHandlerKey(eventId, target) {
    return [eventId, target].join('-')
  }

  /**
   * @param {String} basePath
   * @param {Array.<String>} [exclude]
   * @returns {ServerCodeModel}
   */
  static build(basePath, exclude) {
    const start = Date.now()

    logger.info('Building Model..')

    const model = new ServerCodeModel()
    model.loadFiles(basePath, exclude)

    logger.info(`ServerCode Model built in ${Date.now() - start}ms`)

    model.print()

    return model
  }
}

module.exports = ServerCodeModel