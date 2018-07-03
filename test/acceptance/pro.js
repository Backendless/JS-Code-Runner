'use strict'
const path = require('path')

const app = {
  server   : 'http://localhost:9000',
  msgBroker: {
    host: 'localhost',
    port: 6379
  },
  repoPath : path.resolve(__dirname, '../../../backendless/src/server/play/repo'),
  id       : 'A90A535E-6B03-DC58-FF29-C4D3FD914D00',
  blKey    : '3ECC46DC-7C6D-5E27-FF17-D61C98CB5500',
  restKey  : 'AD8A0EC2-A131-D635-FF00-18C88BEBB500'
}

const TIMEOUT_EXCEEDED_MSG = (
  'Custom business logic execution has been terminated because it did not complete in permitted time - 5 seconds'
)

const promise     = require('../../lib/util/promise'),
      assert      = require('assert'),
      Backendless = require('backendless'),
      serverCode  = require('../support/server-code'),
      request     = require('../support/request')(app),
      events      = require('../../lib/server-code/events'),
      logger      = require('../../lib/util/logger'),
      PERSISTENCE = events.providers.PERSISTENCE

require('mocha')

Backendless.serverURL = app.server
Backendless.initApp(app.id, app.restKey)

function cleanTable(tableName) {
  const dataStore = Backendless.Persistence.of(tableName)
  const restUrl = dataStore.restUrl

  dataStore.restUrl = `${Backendless.appPath}/data/bulk/${dataStore.className}?where=created>0`

  return dataStore.remove({ toJSON: () => '' })
    .then(() => dataStore.restUrl = restUrl)
}

describe('In CLOUD', function() {
  this.timeout(10000)

  before(function() {
    this.proRunner = serverCode(app).startPro()

    return serverCode(app).clean()
  })

  after(function() {
    if (this.proRunner) {
      this.proRunner.kill()
    }
  })

  describe('[before] event handler', function() {
    it('should be able to modify request', function(done) {
      serverCode(app)
        .addHandler(PERSISTENCE.events.beforeCreate, (req) => {
          req.item.name += ' Bar'
        })
        .deploy()
        .then(() => {
          request('post', '/data/Person', { name: 'Foo' })
            .expect(res => res.body = { name: res.body.name })
            .expect(200, { name: 'Foo Bar' }, done)
        }, done)
    })

    it('should be able to replace request', function(done) {
      serverCode(app)
        .addHandler(PERSISTENCE.events.beforeCreate, (req) => {
          req.item = { Foo: 'Bar' }
        })
        .deploy()
        .then(() => {
          request('post', '/data/Person', { name: 'Foo' })
            .expect(200, /"Foo":"Bar"/, done)
        }, done)
    })

    it('should be able to prevent [default] and [after] behaviours by returning specific result', function(done) {
      serverCode(app)
        .addHandler(PERSISTENCE.events.beforeCreate, () => {
          return { foo: 'bar' }
        })
        .addHandler(PERSISTENCE.events.afterCreate, () => {
          throw 'Should not be called'
        })
        .deploy()
        .then(() => {
          request('post', '/data/Person', { name: 'Foo' })
            .expect(200, { foo: 'bar', ___class: 'Person' }, done)
        }, done)
    })

    it('should be able to prevent default behavior by throwing simple Error', function(done) {
      serverCode(app)
        .addHandler(PERSISTENCE.events.beforeCreate, () => {
          throw new Error('You shall not pass')
        })
        .deploy()
        .then(() => {
          request('post', '/data/Person', { name: 'Foo' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(400, { code: 0, message: 'You shall not pass' }, done)
        }, done)
    })

    it('should be able to prevent default behavior by throwing custom Error', function(done) {
      serverCode(app)
        .addHandler(PERSISTENCE.events.beforeCreate, () => {
          throw new Backendless.ServerCode.Error(1000, 'You shall not pass')
        })
        .deploy()
        .then(() => {
          request('post', '/data/Person', { name: 'Foo' })
            .expect(400, { code: 1000, message: 'You shall not pass' }, done)
        })
        .catch(done)
    })
  })

  describe('[after] event handler', function() {
    it('should be able to modify server response', function(done) {
      serverCode(app)
        .addHandler(PERSISTENCE.events.beforeCreate, (res) => {
          res.item.name += ' Bar'
        })
        .addHandler(PERSISTENCE.events.afterCreate, (req, res) => {
          res.result.name += ' Baz'
        })
        .deploy()
        .then(() => {
          request('post', '/data/Person', { name: 'Foo' })
            .expect(200, /"name":"Foo Bar Baz"/, done)
        }, done)
    })

    it('should be able to replace server response', function(done) {
      serverCode(app)
        .addHandler(PERSISTENCE.events.afterCreate, () => {
          return { replaced: true }
        })
        .deploy()
        .then(() => {
          request('post', '/data/Person', { name: 'Foo' })
            .expect(200, { replaced: true }, done)
        }, done)
    })

    it('should be able to throw an error', function(done) {
      serverCode(app)
        .addHandler(PERSISTENCE.events.afterCreate, () => {
          throw new Backendless.ServerCode.Error(1000, 'You shall not pass')
        })
        .deploy()
        .then(() => {
          request('post', '/data/Person', { name: 'Foo' })
            .expect(400, { code: 1000, message: 'You shall not pass' }, done)
        })
        .catch(done)
    })
  })

  describe('custom events', function() {
    it('should be able to return complex object', function(done) {
      serverCode(app)
        .addCustomEvent('readdir', () => ({ foo: 'bar' }))
        .deploy()
        .then(() => {
          request('post', '/servercode/events/readdir')
            .expect(200, { foo: 'bar' }, done)
        })
        .catch(done)
    })

    it('should be able to return primitive', function(done) {
      serverCode(app)
        .addCustomEvent('readdir', () => 'test')
        .deploy()
        .then(() => {
          request('post', '/servercode/events/readdir')
            .expect(200, { result: 'test' }, done)
        })
        .catch(done)
    })
  })

  describe('security', function() {
    it('should allow user to access app folder', function(done) {
      function handler() {
        return { items: require('fs').readdirSync(process.env.HOME) }
      }

      logger.verbose = true

      serverCode(app)
        .addCustomEvent('readHomeDir', handler)
        .deploy()
        .then(() => {
          request('post', '/servercode/events/readHomeDir')
            .expect(200, { items: ['files'] }, done)
        })
        .catch(done)
    })

    it('should forbid access to fs outside of user/app home folder', function(done) {
      function handler() {
        const fs = require('fs')

        return {
          items: fs.readdirSync(path.resolve(process.env.HOME, '..'))
          //, ff   : fs.readdirSync(path.resolve(process.env.HOME, '..', '00dfa30d-e8b2-1389-fff2-03b958eff300'))
        }
      }

      serverCode(app)
        .addCustomEvent('readOther', handler)
        .deploy()
        .then(() => {
          request('post', '/servercode/events/readOther')
            .expect(400, /"message":"EACCES: permission denied/, done)
        })
        .catch(done)
    })

    describe('external hosts', function() {
      before(function() {
        function handler(req) {
          return new Promise((resolve, reject) => {
            require('http').get(req.args.url, (res) => {
              let body = ''

              res.on('data', (chunk) => body += chunk)
              res.on('end', () => {
                resolve({ body })
              })

              res.resume()
            }).on('error', reject)
          })
        }

        return serverCode(app)
          .addCustomEvent('testExternal', handler)
          .deploy()
      })

      it('should forbid access to registered external host', function(done) {
        request('post', '/servercode/events/testExternal', { url: app.server })
          .expect(200, /All works!/, done)
      })

      it('should allow access to registered external host', function(done) {
        request('post', '/servercode/events/testExternal', { url: 'http://google.com' })
          .expect(400, /ECONNREFUSED/, done)
      })
    })
  })

  describe('task timeout', function() {
    this.timeout(30000)

    it('should be respected in custom event handler', function(done) {
      serverCode(app)
        .addCustomEvent('testTimeout', () => new Promise(() => {
        }))
        .deploy()
        .then(() => {
          request('post', '/servercode/events/testTimeout')
            .expect(400, { code: 15000, message: TIMEOUT_EXCEEDED_MSG }, done)
        })
        .catch(done)
    })

    it('should be respected in persistence', function(done) {
      serverCode(app)
        .addHandler(PERSISTENCE.events.beforeCreate, () => new Promise(() => {
        }))
        .deploy()
        .then(() => {
          request('post', '/data/Person', { name: 'Foo' })
            .expect(400, { code: 15000, message: TIMEOUT_EXCEEDED_MSG }, done)
        })
        .catch(done)
    })
  })

  describe('timer', function() {
    before(function() {
      return Backendless.Persistence.of('TestTimer').save({})
    })

    beforeEach(function() {
      return cleanTable('TestTimer')
    })

    it('should tick', function() {
      this.timeout(200000)

      function timerTick() {
        return Backendless.Persistence.of('TestTimer').save({ tick: new Date().getTime() })
      }

      const timer = {
        name: 'test',

        frequency: {
          schedule: 'custom',
          repeat  : { every: 60 }
        },

        execute: timerTick
      }

      return serverCode(app)
        .addTimer(timer)
        .deploy()
        .then(() => promise.wait(130000)) //wait for 2 ticks + pad
        .then(() => Backendless.Persistence.of('TestTimer').find())
        .then(result => assert.equal(result.data.length, 2))
    })
  })
})