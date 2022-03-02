'use strict'

const EventEmitter = require('events').EventEmitter
const Redis = require('ioredis')

const logger = require('../../util/logger')
const { hrtime } = require('../../util/date')
const { compress, decompress } = require('../../util/compression')

const REDIS_EXPIRE_KEY_NOT_EXISTS_RESP = 0
const DEFAULT_REDIS_GETTER_CLIENTS_COUNT = 1

class MessagesBroker extends EventEmitter {
  constructor({ connection, compressionEnabled, compressionThreshold, gettersCount }) {
    super()

    this.connectionInfo = connection
    this.compressionEnabled = compressionEnabled
    this.compressionThreshold = compressionThreshold

    this.gettersCount = gettersCount || DEFAULT_REDIS_GETTER_CLIENTS_COUNT
    this.getters = []

    this.setter = null
    this.subscriber = null

    this.subscribed = false
  }

  createClient(name, isMainClient) {
    return new Promise(resolve => {
      if (isMainClient) {
        logger.info('Connection to Redis...')
      }

      const client = this[name] = new Redis(Object.assign({}, this.connectionInfo, {
        retryStrategy: times => {
          const nextReconnectionDelay = Math.min(times * 500, 5000)

          if (isMainClient) {
            logger.info(`Redis: will try to reconnect in: ${nextReconnectionDelay / 1000} seconds`)
          }

          return nextReconnectionDelay
        }
      }))

      //ignore redis deprecation warnings
      client.on('warning', () => undefined)
      client.on('error', error => {
        if (isMainClient) {
          logger.error(error.message)
        }
      })

      client.once('ready', () => {
        if (isMainClient) {
          logger.info('Connection with Redis has been established')

          client.on('connect', () => {
            logger.info('Connection with Redis has been restored')

            this.emit('reconnect')
          })
        }

        resolve()
      })
    })
  }

  forEachGetterClient(iterator) {
    for (let i = 0; i < this.gettersCount; i++) {
      iterator(i)
    }
  }

  init() {
    const getters = []

    this.forEachGetterClient(index => {
      const getterName = composeGetterClientName(index)

      getters.push(this.createClient(getterName, !this.getters.length))

      this.getters.push(this[getterName])
    })

    return Promise.all([
      ...getters,
      this.createClient('setter'),
      this.createClient('subscriber')
    ])
  }

  end() {
    const getters = []

    this.forEachGetterClient(index => {
      const getter = this[composeGetterClientName(index)]

      if (getter) {
        getters.push(getter)
      }
    })

    return Promise.all([
      ...getters.map(getter => getter.end(false)),
      this.setter && this.setter.end(false),
      this.subscriber && this.subscriber.end(false)
    ])
  }

  async stopGetters() {
    const requests = []

    this.forEachGetterClient(index => {
      const getter = this[composeGetterClientName(index)]

      if (getter) {
        requests.push(getter.end(true))
      }
    })

    await Promise.all(requests)
  }

  async stopSetters() {
    await this.setter.quit()
  }

  async expireKey(key, ttl, keyDescription) {
    keyDescription = keyDescription || key

    const result = await this.setter.expire(key, ttl)

    if (result === REDIS_EXPIRE_KEY_NOT_EXISTS_RESP) {
      throw new Error(`${keyDescription} doesn't exist on server`)
    }
  }

  async getTask(tasksChannel) {
    const getter = this.getters.pop()

    let msg

    try {
      msg = this.compressionEnabled
        ? await getter.blpopBuffer(tasksChannel, 0)
        : await getter.blpop(tasksChannel, 0)
    } finally {
      this.getters.push(getter)
    }

    if (msg && msg.length) {
      try {
        const decompressedData = this.compressionEnabled
          ? await decompress(msg[1])
          : msg[1]

        return JSON.parse(decompressedData)
      } catch (e) {
        throw new Error('Unable to parse received task. ' + e.message)
      }
    }
  }

  async pushTaskBack(tasksChannel, task) {
    logger.debug(`Return task back to the queue ${tasksChannel}`)

    if (this.compressionEnabled) {
      const getCompressingTime = hrtime()

      task = await compress(task, this.compressionThreshold)

      logger.debug(`Compressed task in ${getCompressingTime()}ms`)
    }

    const getPublishingTime = hrtime()

    await this.setter.rpush(tasksChannel, JSON.stringify(task))

    logger.debug(`Returned task to the Redis in ${getPublishingTime()}ms`)
  }

  async setTaskResult(task, result) {
    const responseChannel = task.responseChannelId
    const workerPID = task.workerPID

    if (this.compressionEnabled) {
      const getCompressingTime = hrtime()

      result = await compress(result, this.compressionThreshold)

      logger.debug(`[${workerPID}] Compressed task result in ${getCompressingTime()}ms`)
    }

    const getPublishingTime = hrtime()

    await this.setter.publish(responseChannel, result)

    logger.debug(`[${workerPID}] Published task result to the Redis in ${getPublishingTime()}ms`)
  }

  subscribe(event, callback) {
    if (!this.subscribed) {
      this.subscriber.on('message', (channel, message) => {
        let parsedMessage = null

        try {
          parsedMessage = JSON.parse(message)
        } catch (e) {
          parsedMessage = message
        }

        this.emit(channel, parsedMessage)
      })

      this.subscribed = true
    }

    this.on(event, callback)

    this.subscriber.subscribe(event)
  }
}

function composeGetterClientName(index) {
  return `getter_${index}`
}

module.exports = MessagesBroker
