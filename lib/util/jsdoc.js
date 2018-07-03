'use strict'

const path = require('path')

class ClassDef {
  constructor(name) {
    this.name = name
    this.methods = {}
    this.properties = {}
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
  }

  addParam(name, type, optional) {
    this.params.push(new ParamDef(name, type, optional))
  }

  addTag(name, value) {
    this.tags[name] = value
  }
}

class ParamDef {
  constructor(name, type, optional) {
    this.name = name
    this.type = type
    this.optional = optional
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

const jsdocPath = path.join(process.cwd(), 'node_modules', 'jsdoc', 'lib')

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

exports.describeClasses = function(fileName) {
  const docs = parseJSDoc(fileName)
  const fd = new FileDescriptor()

  docs.forEach(item => {
    if (item.kind === 'typedef' || item.kind === 'class') { //class definition
      const classDef = fd.addClass(item.name)
      classDef.description = item.description

      item.properties && item.properties.forEach(prop => {
        classDef.property(prop.name).type = TypeDef.fromDoc(prop.type)
      })

    } else if (item.memberof) { //class members

      if (item.kind === 'function') { //class method
        const methodDef = fd.addClass(item.memberof).method(item.name)
        methodDef.returnType = TypeDef.fromDoc(item.returns && item.returns[0] && item.returns[0].type)
        methodDef.access = item.access || 'public'
        methodDef.description = item.description

        if (item.params) {
          item.params.forEach(param =>
            methodDef.addParam(param.name, TypeDef.fromDoc(param.type), !!param.optional))
        }

        if (item.tags) {
          item.tags.forEach(tag => methodDef.addTag(tag.title, tag.value))
        }

      } else if (item.kind === 'member' && item.scope === 'instance' && item.type) { //class property
        fd.addClass(item.memberof).property(item.name).type = TypeDef.fromDoc(item.type)
      }
    }
  })

  return Object.keys(fd.classes).map(name => fd.classes[name])
}