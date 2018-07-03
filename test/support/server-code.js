'use strict'

const CodeRunner = require('../../lib'),
      fs         = require('fs'),
      path       = require('path')

const DIR = 'acceptance'

function prepareDir() {
  if (fs.existsSync(DIR)) {
    fs.readdirSync(DIR).forEach(function(file) {
      fs.unlinkSync(`${DIR}/${file}`)
    })

    fs.rmdirSync(DIR)
  }

  fs.mkdirSync(DIR)
}

function providerApi(provider) {
  return provider.id.substr(0, 1).toUpperCase() + provider.id.substring(1)
}

let nextId = 0

class ServerCode {
  constructor(app) {
    this.id = nextId++
    this.app = app
    this.items = []
  }

  addHandler(event, handler, context) {
    const p = event.provider
    const ctx = p.targeted ? `'${context || '*'}'` : ''
    const handlerBody = (
      "'use strict';\n" +
      `Backendless.ServerCode.${providerApi(p)}.${event.name}(${ctx}${ctx ? ', ' : ''}${handler.toString()});`
    )

    this.items.push(handlerBody)

    return this
  }

  addCustomEvent(event, handler) {
    const handlerBody = (
      "'use strict';\n" +
      `Backendless.ServerCode.customEvent('${event}', ${handler.toString()});`
    )

    this.items.push(handlerBody)

    return this
  }

  addTimer(opts) {
    const tickFn = opts.execute
    delete opts.execute

    opts = JSON.stringify(opts)

    const timerBody = (`
      'use strict';
      Backendless.ServerCode.addTimer(${opts.substring(0, opts.length - 1)}, 
        execute: ${tickFn.toString()}
      });
    `)

    this.items.push(timerBody)

    return this
  }

  addService() {
    //TODO: implement me
    return this
  }

  clean() {
    this.items = []

    return this.deploy()
  }

  startPro() {
    const spawn = require('child_process').spawn
    const cwd = path.resolve(__dirname, '../../')

    const proRunner = spawn('bin/coderunner', [
      'pro',
      '--msg-broker-host',
      this.app.msgBroker.host,
      '--msg-broker-port',
      this.app.msgBroker.port,
      '--repo-path',
      this.app.repoPath,
    ], { cwd, stdio: 'inherit' })

    proRunner.on('exit', function(code) {
      console.log('ProRunner exit with code', code)
    })

    proRunner.on('error', (err) => {
      console.log('Failed to start ProRunner', err)
    })

    return proRunner
  }

  deploy() {
    prepareDir()

    this.items.forEach((item, i) => {
      fs.writeFileSync(`${DIR}/bl-${nextId}-${i}.js`, item)
    })

    return CodeRunner.deploy({
      allowEmpty : true,
      backendless: {
        apiServer: this.app.server
      },
      app        : {
        id     : this.app.id,
        apiKey : this.app.blKey,
        version: this.app.version,
        files  : ['!node_modules/**', `${DIR}/**`]
      }
    })
  }
}

module.exports = function(app) {
  return new ServerCode(app)
}