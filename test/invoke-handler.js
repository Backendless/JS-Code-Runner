'use strict';

const should          = require('should'),
      events          = require('../lib/server-code/events'),
      json            = require('../lib/util/json'),
      ServerCode      = require('../lib/server-code/api'),
      executor        = require('../lib/server-code/runners/tasks/executor'),
      executionResult = require('../lib/server-code/runners/tasks/util/result-wrapper').executionResult,
      argsUtil        = require('../lib/server-code/runners/tasks/util/args'),
      PERSISTENCE     = events.providers.PERSISTENCE,
      BEFORE_CREATE   = PERSISTENCE.events.beforeCreate,
      AFTER_CREATE    = PERSISTENCE.events.afterCreate,
      CUSTOM_EVENT    = events.providers.CUSTOM.events.execute;

require('mocha');

function modelStub(handlerFn, classMappings) {
  return {
    getHandler   : () => ({ invoke: handlerFn }),
    classMappings: classMappings
  };
}

function createTask(event, args, async) {
  return {
    ___jsonclass : executor.RMI,
    eventId      : event.id,
    async        : !!async,
    initAppData  : {},
    applicationId: '',
    relativePath : '',
    arguments    : argsUtil.encode(args || [])
  };
}

function invokeAndParse(task, model) {
  return executor.execute(task, { backendless: { repoPath: '' } }, model)
    .then(res => res && json.parse(res))
    .then(res => {
      if (res && res.arguments) {
        res.arguments = res.arguments && argsUtil.decode(res.arguments);
      }

      return res;
    });
}

describe('[invoke-handler] task executor', function() {
  it('should fill [request] params', function() {
    const task = createTask(BEFORE_CREATE, [{}, { name: 'John' }]);

    function handler(req) {
      should.exist(req.item);
      req.item.should.be.eql({ name: 'John' });
    }

    return invokeAndParse(task, modelStub(handler));
  });

  describe('should perform class mapping', function() {
    it('for persistence items', function() {
      class Foo {
      }
      class Bar {
      }
      class Baz {
      }

      let handlerInvoked;

      function handler(req, res) {
        handlerInvoked = true;

        req.item.should.be.instanceof(Foo);
        should.equal(req.item.a, 'a');

        req.item.bar.should.be.instanceof(Bar);
        should.equal(req.item.bar.b, 'b');

        res.result[0].should.be.instanceof(Baz);
        res.result[1].should.be.instanceof(Baz);
      }

      const item = { a: 'a', bar: { ___class: 'Bar', b: 'b' }, ___class: 'Foo' };
      const result = executionResult(null, [{ ___class: 'Baz' }, { ___class: 'Baz' }]);

      return invokeAndParse(createTask(AFTER_CREATE, [{}, item, result]), modelStub(handler, {
        Foo,
        Bar,
        Baz
      }))
        .then((res) => {
          should.equal(handlerInvoked, true);

          should.not.exists(res.exception);

          should.equal(res.arguments[1].___class, 'Foo');
          should.equal(res.arguments[1].bar.___class, 'Bar');
          should.equal(res.arguments[2].result[0].___class, 'Baz');
          should.equal(res.arguments[2].result[1].___class, 'Baz');
        });
    });
  });

  describe('should handle', function() {
    it('unsupported event error', function() {
      return invokeAndParse(createTask({ id: -1 }), { handlers: [] }).then(res => {
        should.exist(res.exception);
        res.exception.exceptionMessage.should.startWith('Integrity violation');
      });
    });

    it('errors raised in the event handler', function() {
      function handler() {
        throw new Error('Error');
      }

      return invokeAndParse(createTask(BEFORE_CREATE), modelStub(handler)).then(res => {
        should.exist(res.exception);
        res.exception.exceptionMessage.should.equal('Error');
      });
    });

    it('custom errors', function() {
      function handler() {
        throw new ServerCode.Error(10, 'My Custom Error');
      }

      return invokeAndParse(createTask(BEFORE_CREATE), modelStub(handler)).then(res => {
        should.exist(res.exception);
        res.exception.code.should.equal(10);
        res.exception.exceptionMessage.should.equal('My Custom Error');
      });
    });

    it('and escape string error code', function() {
      function handler() {
        const err = new Error('StreamError');
        err.code = 'ENOTFOUND';

        throw err;
      }

      return invokeAndParse(createTask(BEFORE_CREATE), modelStub(handler)).then(res => {
        should.exist(res.exception);
        res.exception.code.should.equal(0);
        res.exception.exceptionMessage.should.equal('StreamError');
      });
    });

    it('async errors raised in the event handler behind the promise', function() {
      function handler() {
        process.nextTick(() => {
          throw new Error('Async Error');
        }, 0);

        //never resolved promise
        return new Promise(() => {
        });
      }

      return invokeAndParse(createTask(BEFORE_CREATE), modelStub(handler)).then(res => {
        should.exist(res.exception);
        res.exception.exceptionMessage.should.equal('Async Error');
      });
    });

    it('handler execution timeout', function() {
      const task = createTask(BEFORE_CREATE);
      task.timeout = 1;

      function handler() {
        return new Promise((resolve) => {
          setTimeout(() => resolve('buba'), 20);
        });
      }

      return invokeAndParse(task, modelStub(handler)).then(res => {
        should.exist(res.exception);
        res.exception.exceptionMessage.should.equal('Task execution is aborted due to timeout');
      });
    });
  });

  describe('in [before] event phase', function() {
    it('should allow input parameters modifying', function() {
      const task = createTask(BEFORE_CREATE, [{}, { name: 'John' }]);

      function handler(req) {
        req.item = { name: 'Dou' };
      }

      return invokeAndParse(task, modelStub(handler)).then(res => {
        res.arguments[1].should.be.eql({ name: 'Dou' });
      });
    });

    it('should allow short circuit', function() {
      const task = createTask(BEFORE_CREATE, [{}, {}, { name: 'John', id: 1 }]);

      function handler() {
        return { name: 'Dou', id: 2 };
      }

      return invokeAndParse(task, modelStub(handler)).then(res => {
        should.not.exists(res.exception);

        res.arguments[0].prematureResult.should.be.eql({ name: 'Dou', id: 2 });
      });
    });
  });

  describe('in [after] event phase', function() {
    it('should provide succeeded server result in {response} handler argument', function() {
      const result = { name: 'John', id: 1 };
      const wrappedResult = executionResult(null, result);
      const task = createTask(AFTER_CREATE, [{}, {}, wrappedResult]);

      function handler(req, res) {
        should.not.exist(res.error);
        should.exist(res.result);
        res.result.should.be.eql(result);
      }

      return invokeAndParse(task, modelStub(handler)).then(res => {
        should.not.exists(res.exception);

        res.arguments[2].should.be.eql(wrappedResult);
      });
    });

    it('should provide erred server result in {response} handler argument', function() {
      const error = 'error';
      const erredResult = executionResult(error);
      const task = createTask(AFTER_CREATE, [{}, {}, erredResult]);

      function handler(req, res) {
        should.not.exist(res.result);
        should.exist(res.error);
        res.error.exceptionMessage.should.be.eql(error);

        throw new Error(error);
      }

      return invokeAndParse(task, modelStub(handler)).then(res => {
        res.arguments.should.be.empty();
        res.exception.exceptionMessage.should.be.eql(error);
      });
    });

    describe('should allow server result modifying', function() {
      it('by returning a value from handler', function() {
        const task = createTask(AFTER_CREATE, [{}, {}, executionResult(null, {
          name: 'John',
          id  : 1
        })]);

        function handler() {
          return { name: 'Dou', id: 2 };
        }

        return invokeAndParse(task, modelStub(handler)).then(res => {
          res.arguments[2].result.should.be.eql({ name: 'Dou', id: 2 });
        });
      });

      it('by changing {res.result}', function() {
        const task = createTask(AFTER_CREATE, [{}, {}, executionResult(null, { name: 'John', id: 1 })]);

        function handler(req, res) {
          res.result.name = 'John Dou';
        }

        return invokeAndParse(task, modelStub(handler)).then(res => {
          res.arguments[2].result.should.be.eql({ name: 'John Dou', id: 1 });
        });
      });

      it('by changing {res.error}', function() {
        const task = createTask(AFTER_CREATE, [{}, {}, executionResult('Error')]);

        function handler(req, res) {
          res.error.code = 1;
        }

        return invokeAndParse(task, modelStub(handler)).then(res => {
          should.exists(res.arguments[2].exception);

          res.arguments[2].exception.code.should.equal(1);
          res.arguments[2].exception.exceptionMessage.should.equal('Error');
        });
      });

      it('by replacing {res.result} and {res.error}', function() {
        const task = createTask(AFTER_CREATE, [{}, {}, executionResult(null, null)]);

        function handler(req, res) {
          res.result = { name: 'Dou', id: 2 };
          res.error = {
            code            : 4,
            exceptionMessage: 'Error',
            exceptionClass  : 'java.lang.RuntimeException'
          };
        }

        return invokeAndParse(task, modelStub(handler)).then(res => {
          should.exists(res.arguments[2].result);
          should.exists(res.arguments[2].exception);

          res.arguments[2].result.should.be.eql({ name: 'Dou', id: 2 });
          res.arguments[2].exception.code.should.equal(4);
          res.arguments[2].exception.exceptionMessage.should.equal('Error');
        });
      });
    });
  });

  describe('for async events', function() {
    const task = createTask(AFTER_CREATE, [], true);
    task.timeout = 3;

    it('should wait for handler`s promise', function() {
      let handlerFinished = false;

      function handler() {
        return new Promise(resolve => {
          setTimeout(() => {
            handlerFinished = true;
            resolve();
          }, 2);
        });
      }

      return invokeAndParse(task, modelStub(handler))
        .then(() => {
          handlerFinished.should.be.true();
        });
    });

    it('should not return any result', function() {
      function handler() {
        return {};
      }

      return invokeAndParse(task, modelStub(handler)).should.be.fulfilledWith(undefined);
    });
  });

  describe('for custom events', function() {
    it('should wrap numeric value to object', function() {
      return invokeAndParse(createTask(CUSTOM_EVENT, []), modelStub(() => 1)).then(res => {
        should.exists(res.arguments[2]);
        res.arguments[2].should.be.eql({ result: 1 });
      });
    });

    it('should wrap string value to object', function() {
      return invokeAndParse(createTask(CUSTOM_EVENT, []), modelStub(() => 'abc')).then(res => {
        should.exists(res.arguments[2]);
        res.arguments[2].should.be.eql({ result: 'abc' });
      });
    });

    it('should wrap boolean value to object', function() {
      return invokeAndParse(createTask(CUSTOM_EVENT, []), modelStub(() => true)).then(res => {
        should.exists(res.arguments[2]);
        res.arguments[2].should.be.eql({ result: true });
      });
    });

    it('should wrap date value to object', function() {
      const date = new Date();

      return invokeAndParse(createTask(CUSTOM_EVENT, []), modelStub(() => date)).then(res => {
        should.exists(res.arguments[2]);
        res.arguments[2].should.be.eql({ result: date.toISOString() });
      });
    });

    it('should not wrap complex object', function() {
      const task = createTask(CUSTOM_EVENT, []);
      const result = { a: 'b' };

      function handler() {
        return result;
      }

      return invokeAndParse(task, modelStub(handler)).then(res => {
        should.exists(res.arguments[2]);
        res.arguments[2].should.be.eql(result);
      });
    });

    it('should not wrap null or undefined value', function() {
      return invokeAndParse(createTask(CUSTOM_EVENT, []), modelStub(() => undefined)).then(res => {
        should.equal(res.arguments[2], null);
      });
    });

    it('should wrap error', function() {
      function handler() {
        throw new Error('Error');
      }

      return invokeAndParse(createTask(CUSTOM_EVENT, []), modelStub(handler)).then(res => {
        should.equal(res.exception.exceptionMessage, 'Error');
      });
    });
  });
});