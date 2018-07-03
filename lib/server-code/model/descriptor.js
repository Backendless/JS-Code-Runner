'use strict'

const fs              = require('fs'),
      path            = require('path'),
      ServerCodeModel = require('./index'),
      logger          = require('../../util/logger'),
      toUnix          = require('../../util/path').toUnix

const DESCRIPTOR_FILE = 'model.json'

function normalizeDictFilePath(dict) {
  Object.keys(dict).forEach(key => {
    if (dict[key].provider) {
      dict[key].provider = toUnix(dict[key].provider)
    }
  })

  return dict
}

class ServerCodeModelDescriptor {
  constructor(basePath, opts) {
    this.basePath = basePath

    this.handlers = normalizeDictFilePath(opts.handlers || {})
    this.types = normalizeDictFilePath(opts.types || {})
    this.services = normalizeDictFilePath(opts.services || {})

    this.definitions = opts.definitions || {}
    this.definitions.files = (this.definitions.files || []).map(toUnix)
  }

  get typesFiles() {
    return Object.keys(this.types).map(type => this.types[type].provider)
  }

  buildModelForFile(file) {
    logger.info(`Building ServerCode Model for path (${this.basePath})`)

    const start = Date.now()

    const model = new ServerCodeModel()
    model.definitions.setExplicitly(this.definitions)
    model.loadFiles(this.basePath, null, this.typesFiles.concat([file]))

    if (model.errors.length) {
      throw new Error(`${model.errors[0].message}. This issue is caused by [${model.errors[0].serverCodeFile}]`)
    }

    logger.info(`ServerCode Model built in ${Date.now() - start}ms`)

    return model
  }

  static load(basePath) {
    const descriptorPath = path.join(basePath, DESCRIPTOR_FILE)

    if (!fs.existsSync(descriptorPath)) {
      throw new Error(`Model Descriptor not found (${descriptorPath})`)
    }

    return new ServerCodeModelDescriptor(basePath, require(descriptorPath))
  }
}

module.exports = ServerCodeModelDescriptor