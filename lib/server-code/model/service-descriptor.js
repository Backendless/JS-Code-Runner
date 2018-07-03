'use strict'

const xml = require('xml')
const NAMESPACE = 'services'

const typesMapping = {
  STRING : { javaType: 'java.lang.String' },
  BOOLEAN: { javaType: 'boolean', nativeType: 'bool' },
  NUMBER : { javaType: 'float', nativeType: 'float' },
  ARRAY  : { javaType: generic('javaType', 'java.util.List'), nativeType: generic('nativeType', 'List') },
  OBJECT : { javaType: 'java.lang.Object' },
  DATE   : { javaType: 'java.util.Date', nativeType: 'DateTime' }
}

function packaged(name) {
  return `${NAMESPACE}.${name}`
}

function generic(nature, type) {
  return function(elementType) {
    return elementType ? `${type}<${elementType[nature]}>` : type
  }
}

function unwrapPromise(type) {
  return type && type.name === 'Promise' ? unwrapPromise(type.elementType) : type
}

function getTypeMapping(type, definitions) {
  type = unwrapPromise(type) || { name: 'void' }

  function resolve(nature, withinNamespace) {
    let result = mapped && mapped[nature]

    if (typeof result === 'function') {
      result = result(mappedSubType)
    }

    result = result || type.name

    if (definitions[result] && withinNamespace) {
      result = packaged(result)
    }

    return result
  }

  const mapped = typesMapping[type.name.toUpperCase()]
  const mappedSubType = type.elementType && getTypeMapping(type.elementType, definitions)

  return {
    type       : resolve('type'),
    javaType   : resolve('javaType', true),
    nativeType : resolve('nativeType', true),
    fullType   : resolve('fullType', true),
    elementType: mappedSubType && mappedSubType.type
  }
}

const HTTP_METHODS = ['GET', 'PUT', 'POST', 'DELETE']
const isValidHttpMethod = value => HTTP_METHODS.indexOf(value) !== -1

/**
 * Enriches service method node by adding 'method', 'route' and 'description' attributes.
 * @param {Object} methodNode
 * @param {Object} method
 * @returns {Object} methodNode
 */
function enrichMethodNode(methodNode, method) {
  method.description && (methodNode.description = method.description)

  if (method.tags.route) {
    let httpPath = method.tags.route
    let httpMethod = 'GET'
    const sepPos = httpPath.indexOf(' ')

    if (sepPos !== -1) {
      httpMethod = httpPath.substr(0, sepPos).toUpperCase()
      httpPath = httpPath.substr(sepPos + 1)

      if (!isValidHttpMethod(httpMethod)) {
        throw new Error(`Unsupported HTTP method [${httpMethod}] for ${method.name} method`)
      }
    }

    methodNode.method = httpMethod
    methodNode.path = httpPath
  }

  return methodNode
}

/**
 * @param {Array.<String>} services
 * @param {Object.<String, Object>} definitions
 * @returns {*}
 */
function buildServicesXml(services, definitions) {
  const nsNode = [{ _attr: { name: NAMESPACE, fullname: NAMESPACE } }]
  const runtimeNode = [{ _attr: { generationMode: 'FULL' } }]

  const types = new Set()

  function registerType(type) {
    if (type && definitions[type] && !types.has(type)) {
      types.add(type)
      nsNode.push(dataTypeNode(definitions[type]))
    }
  }

  function typedNode(name, type) {
    const mapping = getTypeMapping(type, definitions)

    const result = {
      name      : name,
      type      : mapping.type,
      nativetype: mapping.nativeType,
      fulltype  : mapping.fullType,
      javatype  : mapping.javaType
    }

    mapping.elementType && (result.elementType = mapping.elementType)

    registerType(result.type)
    registerType(result.elementType)

    return result
  }

  function dataTypeNode(definition) {
    const attributes = {
      name         : definition.name,
      description  : definition.description || definition.name,
      fullname     : packaged(definition.name),
      typeNamespace: NAMESPACE
    }

    const datatype = []
    datatype.push({ _attr: attributes })

    Object.keys(definition.properties).forEach(propName => {
      const node = typedNode(propName, definition.properties[propName].type)

      datatype.push({ field: { _attr: node } })
    })

    return { datatype: datatype }
  }

  services.forEach(function(serviceName) {
    const serviceDef = definitions[serviceName]
    const serviceNode = [{
      _attr: {
        name       : serviceName,
        description: (serviceDef && serviceDef.description) || serviceName,
        fullname   : packaged(serviceName),
        namespace  : NAMESPACE
      }
    }]

    nsNode.push({ service: serviceNode })

    if (serviceDef) {
      Object.keys(serviceDef.methods).forEach(name => {
        const method = serviceDef.methods[name]

        if (method.access !== 'private') {
          const methodNode = [{
            _attr: enrichMethodNode(typedNode(name, method.returnType), method)
          }]

          method.params.forEach(param => {
            const argNode = typedNode(param.name, param.type)
            argNode.required = !param.optional

            methodNode.push({
              arg: {
                _attr: argNode
              }
            })
          })

          serviceNode.push({ method: methodNode })
        }
      })
    }
  })

  return xml({ namespaces: [{ namespace: nsNode }, { runtime: runtimeNode }] }, {
    declaration: { encoding: 'ISO-8859-1' },
    indent     : '  '
  })
}

exports.buildXML = buildServicesXml