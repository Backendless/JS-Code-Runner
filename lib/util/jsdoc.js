'use strict'

const path = require('path')
const fs = require('fs')

class ClassDef {
  constructor(name) {
    this.name = name
    this.methods = {}
    this.properties = {}

    this.serviceInfo = {}
  }

  property(name) {
    return this.properties[name] || (this.properties[name] = new PropertyDef())
  }

  method(name) {
    return this.methods[name] || (this.methods[name] = new MethodDef())
  }
}

class PropertyDef {
  type(value) {
    this.type = value
    return this
  }
}

class MethodDef {
  constructor() {
    this.params = []
    this.tags = {}
    this.metaInfo = {
      args: {}
    }
  }

  ensureMetaInfoArgument(name) {
    this.metaInfo.args[name] = this.metaInfo.args[name] || {}
  }

  addParam({
             name,
             label,
             type,
             optional,
             description,
             dictionary,
             dependsOn,
             uiComponent,
             defaultValue,
             schemaLoader,
             hidden,
           }) {
    this.params.push(new ParamDef(name, label, type, optional, description, defaultValue))

    if (dictionary) {
      this.ensureMetaInfoArgument(name)

      this.metaInfo.args[name].dictionary = dictionary
      this.metaInfo.args[name].dependsOn = dependsOn
    }

    if (schemaLoader) {
      this.ensureMetaInfoArgument(name)

      this.metaInfo.args[name].schemaLoader = schemaLoader
      this.metaInfo.args[name].dependsOn = dependsOn
    }

    if (label) {
      this.ensureMetaInfoArgument(name)

      this.metaInfo.args[name].label = label
    }

    if (uiComponent) {
      this.ensureMetaInfoArgument(name)

      this.metaInfo.args[name].uiComponent = uiComponent
    }

    if (defaultValue !== undefined) {
      this.ensureMetaInfoArgument(name)

      this.metaInfo.args[name].defaultValue = defaultValue
    }

    if (hidden) {
      this.ensureMetaInfoArgument(name)

      this.metaInfo.args[name].hidden = true
    }
  }

  addTag(name, value) {
    this.tags[name] = value
  }
}

class ParamDef {
  constructor(name, label, type, optional, description, defaultValue) {
    this.name = name
    this.label = label || name
    this.type = type
    this.optional = optional
    this.defaultValue = defaultValue

    if (description) {
      this.description = description
    }
  }
}

class TypeDef {
  constructor(type) {
    this.name = TypeDef.trim(type)

    const elementType = TypeDef.parseElementType(type)

    if (elementType) {
      this.elementType = new TypeDef(elementType)
    }
  }

  static trim(type) {
    const splitterPos = type.indexOf('.')

    return type.substring(0, splitterPos !== -1 ? splitterPos : undefined)
  }

  static parseElementType(type) {
    const result = type.match(/<(.*)>/)

    return result && result[1] || ''
  }

  static fromDoc(doc) {
    const name = doc && doc.names && doc.names[0]

    return name && new TypeDef(name)
  }
}

class FileDescriptor {
  constructor() {
    this.classes = {}
  }

  addClass(name) {
    if (!this.classes[name]) {
      this.classes[name] = new ClassDef(name)
    }

    return this.classes[name]
  }
}

function resolveJSDocPath() {
  const jsDocHolders = require.resolve.paths('jsdoc/lib')
  const jsDocPaths = jsDocHolders.map(p => path.join(p, 'jsdoc/lib'))

  for (let i = 0; i < jsDocPaths.length; i++) {
    const jsDocPath = jsDocPaths[i]

    if (fs.existsSync(jsDocPath)) {
      return jsDocPath
    }
  }

  throw new Error('Can not resolve path to JSDoc module.')
}

const jsdocPath = resolveJSDocPath()

const jsdocModulePath = module => path.join(jsdocPath, ...module.split('/'))

let _jsdocRequire

const jsdocRequire = modulePath => {
  if (!_jsdocRequire) {
    _jsdocRequire = require('requizzle')({
      infect      : true,
      requirePaths: { before: [jsdocPath] }
    })

    //init jsdoc env
    const Config = _jsdocRequire(jsdocModulePath('jsdoc/config'))
    const env = _jsdocRequire(jsdocModulePath('jsdoc/env'))
    env.conf = new Config().get()
  }

  return _jsdocRequire(jsdocModulePath(modulePath))
}

const parseJSDoc = fileName => {
  const parser = jsdocRequire('jsdoc/src/parser').createParser()
  const handlers = jsdocRequire('jsdoc/src/handlers')

  handlers.attachTo(parser)

  return parser.parse([fileName])
}

const ServiceTagProcessors = {
  'requireoauth'   : t => ({ requireOAuth: t.value !== 'false' }),
  'integrationname': t => ({ integrationName: t.value }),
  'integrationicon': t => ({ integrationIcon: t.value }),
}

const tagHandlers = {
  paramdef: (tag, methodDef, registeredParams) => {
    try {
      const paramDef = JSON.parse(tag.value)

      methodDef.addParam({
        name        : paramDef.name,
        label       : paramDef.label,
        type        : TypeDef.fromDoc({ names: [paramDef.type] }),
        optional    : !paramDef.required,
        description : paramDef.description,
        dictionary  : paramDef.dictionary,
        schemaLoader: paramDef.schemaLoader,
        dependsOn   : paramDef.dependsOn,
        uiComponent : paramDef.uiComponent,
        defaultValue: paramDef.defaultValue,
        hidden      : paramDef.hidden,
      })

      registeredParams[paramDef.name] = 1
    } catch (error) {
      throw new Error(
        'Can not compose the deployment model because of an error with reading method parameter definition. ' +
        `@paramDef ${ tag.value }. ` +
        `Error: ${ error.message }`,
      )
    }
  },
  default : (tag, methodDef) => {
    methodDef.addTag(tag.title, tag.value)
  }
}

exports.describeClasses = function(fileName) {
  const docs = parseJSDoc(fileName)
  const fd = new FileDescriptor()

  docs.forEach(item => {
    if (item.kind === 'typedef' || item.kind === 'class') { //class definition
      const classDef = fd.addClass(item.name)
      classDef.description = item.description

      if (item.tags) {
        item.tags.forEach(tag => {
          if (tag.title === 'paramdef') {
            const paramDef = JSON.parse(tag.value)

            classDef.properties[paramDef.name] = {
              name        : paramDef.name,
              label       : paramDef.label,
              type        : TypeDef.fromDoc({ names: [paramDef.type] }),
              optional    : !paramDef.required,
              description : paramDef.description,
              dictionary  : paramDef.dictionary,
              schemaLoader: paramDef.schemaLoader,
              dependsOn   : paramDef.dependsOn,
              uiComponent : paramDef.uiComponent,
              defaultValue: paramDef.defaultValue,
            }

            return
          }

          const extender = ServiceTagProcessors[tag.title]
            ? ServiceTagProcessors[tag.title](tag)
            : { [tag.originalTitle]: tag.value }

          Object.assign(classDef.serviceInfo, extender)
        })
      }

      item.properties && item.properties.forEach(prop => {
        classDef.property(prop.name).type = TypeDef.fromDoc(prop.type)
      })

    } else if (item.memberof) { //class members

      if (item.kind === 'function') { //class method
        const methodDef = fd.addClass(item.memberof).method(item.name)
        methodDef.returnType = TypeDef.fromDoc(item.returns && item.returns[0] && item.returns[0].type)
        methodDef.access = item.access || 'public'
        methodDef.description = item.description

        const registeredParams = {}

        if (item.tags) {
          item.tags.forEach(tag => {
            const handler = tagHandlers[tag.title] || tagHandlers.default
            handler(tag, methodDef, registeredParams)
          })
        }

        if (item.params) {
          item.params.forEach(param => {
            if (!registeredParams[param.name]) {
              const {
                      name,
                      label,
                      type,
                      optional,
                      description,
                      dictionary,
                      dependsOn,
                      schemaLoader,
                      uiComponent,
                      defaultValue,
                      hidden,
                    } = param

              methodDef.addParam({
                name,
                label,
                type    : TypeDef.fromDoc(type),
                optional: !!optional,
                description,
                dictionary,
                dependsOn,
                schemaLoader,
                uiComponent,
                defaultValue,
                hidden,
              })
            }
          })
        }

      } else if (item.kind === 'member' && item.scope === 'instance' && item.type) { //class property
        fd.addClass(item.memberof).property(item.name).type = TypeDef.fromDoc(item.type)
      }
    }
  })

  return Object.keys(fd.classes).map(name => fd.classes[name])
}
