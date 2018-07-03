'use strict'

const assert     = require('assert'),
      TestModel  = require('./support/test-model'),
      invoke     = require('./helpers/invoke-task'),
      ServerCode = require('../lib/server-code/api'),
      executor   = require('../lib/server-code/runners/tasks/executor'),
      argsUtil   = require('../lib/server-code/runners/tasks/util/args')

const SUCCESS = 'success'

require('mocha')

function createTask(service, method, args, configItems) {
  return {
    ___jsonclass        : executor.RSI,
    initAppData         : {},
    serviceId           : service,
    className           : service,
    method              : method,
    applicationId       : '',
    relativePath        : '',
    invocationContextDto: {
      configurationItems: configItems || []
    },
    arguments           : argsUtil.encode(args || [])
  }
}

describe('[invoke-service] task executor', function() {
  it('should invoke service method', function() {
    let invoked = false

    class Foo {
      bar() {
        invoked = true
      }
    }

    return invoke(createTask(Foo.name, 'bar'), new TestModel().addService(Foo))
      .then(() => assert(invoked))
  })

  it('should pass arguments to service method', function() {
    class Foo {
      bar(a, b, c) {
        assert.equal(a, 1)
        assert.equal(b, 2)
        assert.deepEqual(c, {})

        return SUCCESS
      }
    }

    return invoke(createTask(Foo.name, 'bar', [1, 2, {}]), new TestModel().addService(Foo))
      .then(assertSuccess)
  })

  it('should initialise Backendless with user-token from the request context', function() {
    const userToken = 'wddeupxnpjncbykrlpegexyiunuixxqfckrr'

    class Service {
      testMethod() {
        assert.equal(Backendless.LocalCache.get('user-token'), userToken)

        return SUCCESS
      }
    }

    const task = createTask(Service.name, 'testMethod')
    task.invocationContextDto.userToken = userToken

    return invoke(task, new TestModel().addService(Service)).then(assertSuccess)
  })

  describe('should handle service method result', function() {
    it('numeric', function() {
      class Foo {
        bar() {
          return 100
        }
      }

      return invoke(createTask('Foo', 'bar'), new TestModel().addService(Foo))
        .then(res => assert.equal(res.arguments, 100))
    })

    it('positive boolean', function() {
      class Foo {
        bar() {
          return true
        }
      }

      return invoke(createTask('Foo', 'bar'), new TestModel().addService(Foo))
        .then(res => assert.strictEqual(res.arguments, true))
    })

    it('positive boolean (promised)', function() {
      class Foo {
        bar() {
          return Promise.resolve(true)
        }
      }

      return invoke(createTask('Foo', 'bar'), new TestModel().addService(Foo))
        .then(res => assert.strictEqual(res.arguments, true))
    })

    it('negative boolean', function() {
      class Foo {
        bar() {
          return false
        }
      }

      return invoke(createTask('Foo', 'bar'), new TestModel().addService(Foo))
        .then(res => assert.strictEqual(res.arguments, false))
    })

    it('negative boolean (promised)', function() {
      class Foo {
        bar() {
          return Promise.resolve(false)
        }
      }

      return invoke(createTask('Foo', 'bar'), new TestModel().addService(Foo))
        .then(res => assert.strictEqual(res.arguments, false))
    })

    it('complex object', function() {
      class Foo {
        bar() {
          return { name: 'John Dou' }
        }
      }

      return invoke(createTask('Foo', 'bar'), new TestModel().addService(Foo))
        .then(res => assert.deepEqual(res.arguments, { name: 'John Dou' }))
    })

  })

  describe('should handle error', function() {
    it('when service not found', function() {
      return invoke(createTask('Foo', 'bar'), new TestModel())
        .then(res => assert.equal(res.exception.exceptionMessage, '[Foo] service does not exist'))
    })

    it('when service method not found', function() {
      class Foo {
      }

      return invoke(createTask('Foo', 'bar'), new TestModel().addService(Foo))
        .then(res => assert.equal(res.exception.exceptionMessage,
          '[bar] method does not exist in [Foo] service or is not a function'))
    })

    it('when service method throws an error', function() {
      class Foo {
        bar() {
          throw new Error('erred')
        }
      }

      return invoke(createTask(Foo.name, 'bar'), new TestModel().addService(Foo))
        .then(res => assert.equal(res.exception.exceptionMessage, 'erred'))
    })

    it('when service method rejects promise', function() {
      class Foo {
        bar() {
          return Promise.reject('rejected')
        }
      }

      return invoke(createTask('Foo', 'bar'), new TestModel().addService(Foo))
        .then(res => assert.equal(res.exception.exceptionMessage, 'rejected'))
    })

    it('when service method produces async error behind promise', function() {
      class Test {
        test() {
          return new Promise(() => {
            process.nextTick(() => {
              throw new Error('async-erred')
            })
          })
        }
      }

      return invoke(createTask('Test', 'test'), new TestModel().addService(Test))
        .then(res => assert.equal(res.exception.exceptionMessage, 'async-erred'))
    })
  })

  it('should handle custom error', function() {
    class Foo {
      bar() {
        throw new ServerCode.Error(126, 'erred')
      }
    }

    return invoke(createTask(Foo.name, 'bar'), new TestModel().addService(Foo))
      .then(res => {
        assert.equal(res.exception.exceptionMessage, 'erred')
        assert.equal(res.exception.code, 126)
        assert.equal(res.exception.httpStatusCode, -1)
      })
  })

  it('should handle custom error with specific http status code', function() {
    class Foo {
      bar() {
        throw new ServerCode.Error(126, 'erred', 403)
      }
    }

    return invoke(createTask(Foo.name, 'bar'), new TestModel().addService(Foo))
      .then(res => {
        assert.equal(res.exception.exceptionMessage, 'erred')
        assert.equal(res.exception.code, 126)
        assert.equal(res.exception.httpStatusCode, 403)
      })
  })

  it('should transform arguments if custom types are defined', function() {
    class Foo {
    }

    class Bar {
      constructor() {
        this.baz = {}
      }
    }

    class Baz {
    }

    class Service {
      test(foo, bar, baz) {
        assert(foo instanceof Foo, 'Invalid type casting')
        assert(bar instanceof Bar, 'Invalid type casting')
        assert(bar.baz instanceof Baz, 'Invalid deep type casting')
        assert(baz[0] instanceof Baz, 'Invalid array elements type casting')
        assert(baz[1] instanceof Baz, 'Invalid array elements type casting')

        return SUCCESS
      }
    }

    const model = new TestModel()
      .addService(Service, {
        methods: {
          test: {
            params: [
              { name: 'foo', type: { name: 'Foo' } },
              { name: 'bar', type: { name: 'Bar' } },
              { name: 'baz', type: { name: 'Array', elementType: { name: 'Baz' } } }
            ]
          }
        }
      })
      .addType(Foo)
      .addType(Bar, { properties: { baz: { type: { name: 'Baz' } } } })
      .addType(Baz)

    return invoke(createTask(Service.name, 'test', [new Foo(), new Bar(), [new Baz(), new Baz()]]), model)
      .then(assertSuccess)
  })

  it('should provide a [request] in execution context', function() {
    const task = createTask('Foo', 'bar')
    const model = new TestModel().addService(class Foo {
      bar() {
        assert.equal(this.request.context, task.invocationContextDto)

        return SUCCESS
      }
    })

    return invoke(task, model).then(assertSuccess)
  })

  it('should provide a [config items] in execution context', function() {
    class Foo {
      bar() {
        assert.equal(this.config.one, 'uno')
        assert.equal(this.config.two, '')
        assert.equal(this.config.three, 0)
        assert.equal(this.config.four, 4)
        assert.equal(this.config.five, undefined)

        return SUCCESS
      }
    }

    Foo.configItems = [{
      name        : 'one',
      defaultValue: 'one',
      type        : 'string'
    }, {
      name        : 'two',
      defaultValue: 'two',
      type        : 'string'
    }, {
      name        : 'three',
      defaultValue: 3,
      type        : 'string'
    }, {
      name        : 'four',
      defaultValue: 4,
      type        : 'string'
    }, {
      name: 'five',
      type: 'string'
    }
    ]

    const one = { name: 'one', value: 'uno' }
    const two = { name: 'two', value: '' } //empty value should not be replaced with default value
    const three = { name: 'three', value: 0 } //zero should not be replaced with default value

    return invoke(createTask('Foo', 'bar', null, [one, two, three]), new TestModel().addService(Foo))
      .then(assertSuccess)
  })

  it('should provide a context and config into service constructor', function() {
    const lang = { name: 'lang', value: 'english' }
    const task = createTask('GreetingsService', 'greetings', null, [lang])

    class GreetingsService {
      constructor(config, context) {
        assert.equal(config.lang, 'english')
        assert.equal(context, task.invocationContextDto)
      }

      greetings() {
        return SUCCESS
      }
    }

    GreetingsService.configItems = [{ name: 'lang', type: 'string' }]

    return invoke(task, new TestModel().addService(GreetingsService))
      .then(assertSuccess)
  })
})

function assertSuccess(res) {
  assert.equal(res.exception, null, res.exception && res.exception.exceptionMessage || undefined)
  assert.equal(res.arguments, SUCCESS)
}