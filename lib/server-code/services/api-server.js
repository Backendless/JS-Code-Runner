'use strict'

const logger  = require('../../util/logger'),
      request = require('backendless').Request

const lang = 'JS'
const CODE_SIZE_RESTRICTION_ERR_CODE = 11007

const wrapError = (operation, error) => {

  let message = error.message

  if (error.code === CODE_SIZE_RESTRICTION_ERR_CODE) {
    message += (
      '\nYou can decrease an application deployment zip size ' +
      'by adding an exclusion filters to your {app.files} config parameter. '
    )
  }

  throw new Error(`Unable to ${operation}. ${message}`)
}

class ApiServerService {
  constructor(app, serverUrl) {
    this.app = app
    this.appUrl = `${serverUrl}/${app.id}/${app.apiKey}`
    this.serverUrl = serverUrl
  }

  async registerModel(model) {
    logger.info(`Registering Model on ${this.serverUrl}`)

    try {
      await request.post(this.appUrl + '/servercode/registermodel')
        .send(Object.assign(model.toJSON(), {
          applicationId      : this.app.id,
          deploymentModelName: this.app.model || 'default'
        }))

      logger.info('Model successfully registered')
    } catch (error) {
      wrapError('register Model', error)
    }
  }

  async registerRunner() {
    logger.info(`Registering Code Runner on ${this.serverUrl}`)

    try {
      const { debugId } = await request.post(this.appUrl + `/servercode/registerRunner/${lang}`)

      logger.info('Runner successfully registered.')
      logger.debug(`Debug Session ID: ${debugId}`)

      return debugId

    } catch (error) {
      wrapError('register Runner', error)
    }
  }

  unregisterRunner() {
    return request.get(this.appUrl + '/servercode/unregisterRunner')
  }

  /**
   * @param {ServerCodeModel} model
   * @param {Buffer} modelZip
   */
  async publish(model, modelZip) {
    logger.info('Publishing Model to server')

    const formData = {
      model: this.app.model || 'default',
      code : {
        value  : modelZip,
        options: {
          filename   : 'code',
          contentType: 'application/zip'
        }
      }
    }

    try {
      await request.post(this.appUrl + `/servercode/publishcode/${lang}`).form(formData)

      logger.info('Successfully published')

    } catch (error) {
      wrapError('publish model', error)
    }
  }
}

module.exports = ApiServerService