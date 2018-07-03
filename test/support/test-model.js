'use strict'

const ServerCodeModel = require('../../lib/server-code/model')

class ServerCodeTestModel extends ServerCodeModel {
  constructor() {
    super()

    this.definitions.setExplicitly()
  }

  addService(service, definition) {
    super.addService(service, {})

    return this.addDefinition(service.name, definition)
  }

  addType(type, definition) {
    super.addType(type, {})

    return this.addDefinition(type.name, definition)
  }

  addDefinition(name, definition) {
    if (definition) {
      this.definitions.types[name] = Object.assign({ name: name }, definition)
    }

    return this
  }
}

module.exports = ServerCodeTestModel