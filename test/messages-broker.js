'use strict'

require('should')

const MessagesBroker = require('../lib/server-code/services/messages-broker'),
      decompress     = require('../lib/util/compression').decompress

require('mocha')

const RESPONSE_CHANNEL = 'response_code_runner_ch:test'

function createBroker(compressionEnabled) {
  const broker = new MessagesBroker({ connection: {}, compressionEnabled, compressionThreshold: 0 })

  broker.published = []
  broker.setter = {
    publish: (channel, message) => {
      broker.published.push({ channel, message })

      return Promise.resolve(1)
    }
  }

  return broker
}

function createTask() {
  return { responseChannelId: RESPONSE_CHANNEL, workerPID: 1 }
}

describe('[messages-broker] setTaskResult', function() {
  describe('should not publish', function() {
    [undefined, null, ''].forEach(result => {
      it(`a ${ JSON.stringify(result) } result`, async function() {
        const broker = createBroker(false)

        await broker.setTaskResult(createTask(), result)

        broker.published.should.be.empty()
      })
    })

    it('an empty result when compression is enabled', async function() {
      const broker = createBroker(true)

      await broker.setTaskResult(createTask(), undefined)

      broker.published.should.be.empty()
    })
  })

  it('should publish a result once to the response channel', async function() {
    const broker = createBroker(false)
    const result = JSON.stringify({ ___jsonclass: 'InvocationResult', arguments: [] })

    await broker.setTaskResult(createTask(), result)

    broker.published.should.have.length(1)
    broker.published[0].channel.should.equal(RESPONSE_CHANNEL)
    broker.published[0].message.should.equal(result)
  })

  it('should publish a compressed result when compression is enabled', async function() {
    const broker = createBroker(true)
    const result = JSON.stringify({ ___jsonclass: 'InvocationResult', arguments: [] })

    await broker.setTaskResult(createTask(), result)

    broker.published.should.have.length(1)
    broker.published[0].message.should.be.instanceOf(Buffer)

    const decompressed = await decompress(broker.published[0].message)

    decompressed.should.equal(result)
  })
})
