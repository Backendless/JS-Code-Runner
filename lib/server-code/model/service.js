'use strict'

const DEFAULT_VERSION = '1.0.0'
const ConfigItems = require('../api').ConfigItems

const ServiceDescriptor = require('./service-descriptor')

class ConfigItem {
  constructor(opts) {
    if (!opts) {
      throw new Error('config item should not be empty')
    }

    Object.assign(this, opts)

    if (!this.name) {
      throw new Error(`config item name is not specified: ${JSON.stringify(opts)}`)
    }

    const withChoices = this.options && this.options.length

    if (!withChoices && !this.type) {
      throw new Error(`config item [${this.name}] has no 'type' specified`)
    }

    this.type = ((withChoices && ConfigItems.TYPES.CHOICE || this.type || ConfigItems.STRING)).toUpperCase()

    if (!ConfigItems.TYPES[this.type]) {
      throw new Error(`config item [${this.name}] has invalid type [${this.type}]`)
    }

    if (this.type === ConfigItems.TYPES.CHOICE && !withChoices) {
      throw new Error(`config item [${this.name}] has 'choice' type but choice 'options' were not specified`)
    }
  }
}

class ServiceWrapper {
  constructor(clazz, provider, model) {
    this.clazz = clazz
    this.provider = provider
    this.name = clazz.name
    this.version = clazz.version || DEFAULT_VERSION
    this.description = clazz.description || clazz.name

    Object.defineProperty(this, 'model', { value: model })

    if (!clazz || typeof clazz !== 'function' || !clazz.name) {
      throw new Error('A service must be a named function-constructor or es6 class')
    }

    this.config = (clazz.configItems || []).map(item => new ConfigItem(item))
  }

  /**
   * @param {String} method
   * @param {InvocationContext} context
   * @param {Array} args
   * @returns {*}
   */
  invokeMethod(method, context, args) {
    const config = buildConfig(this.config, context.configurationItems)
    const instance = new this.clazz(config, context)

    instance.config = config
    instance.request = {
      context,
      headers    : context.httpHeaders,
      path       : context.httpPath,
      pathParams : context.httpPathParams || {},
      queryParams: context.httpQueryParams || {},
    }

    if (typeof instance[method] !== 'function') {
      throw new Error(
        `[${method}] method does not exist in [${this.name}] service or is not a function`
      )
    }

    return instance[method].apply(instance, this.transformArgs(method, args))
  }

  transformArgs(method, args) {
    const types = this.model.types
    const typesDefinitions = this.model.definitions.types
    const serviceDef = typesDefinitions[this.name]
    const methodDef = serviceDef && serviceDef.methods[method]
    const methodParamsDef = methodDef && methodDef.params || []

    function transform(value, valueDefinition) {
      if (value && valueDefinition) {
        const typeName = valueDefinition.type.name
        const valueType = types[typeName]

        if (valueType) {
          value = Object.assign(new valueType.clazz(), value)

          const valueTypeDefinition = typesDefinitions[typeName]

          Object.keys(valueTypeDefinition && valueTypeDefinition.properties || {}).forEach(propName => {
            value[propName] = transform(value[propName], valueTypeDefinition.properties[propName])
          })
        } else if (typeName === 'Array' && value.length && valueDefinition.type.elementType) {
          const elementDef = { type: valueDefinition.type.elementType }

          value = value.map(item => transform(item, elementDef))
        }
      }

      return value
    }

    return args.map((arg, i) => {
      const argDef = methodParamsDef && methodParamsDef[i]

      return transform(arg, argDef)
    })
  }

  xml() {
    return ServiceDescriptor.buildXML([this.name], this.model.definitions.types)
  }

  toJSON() {
    return Object.assign({}, this, { xml: this.xml() })
  }
}

function buildConfig(declared, actual) {
  const actualMapped = {}
  actual.forEach(item => actualMapped[item.name] = item.value)

  const result = {}

  declared.forEach((item) => {
    result[item.name] = actualMapped[item.name] != null ? actualMapped[item.name] : item.defaultValue
  })

  return result
}

module.exports = ServiceWrapper