'use strict'

const path                  = require('path'),
      Module                = require('module'),
      Backendless           = require('backendless'),
      logger                = require('../../util/logger'),
      serverCodeFilesInPath = require('../../util/file').serverCodeFilesInPath,
      PersistenceItem       = require('./persistence-item'),
      events                = require('../events'),
      providers             = events.providers,
      PERSISTENCE           = providers.PERSISTENCE,
      MESSAGING             = providers.MESSAGING,
      MEDIA                 = providers.MEDIA,
      GEO                   = providers.GEO,
      USER                  = providers.USER,
      FILE                  = providers.FILE,
      TIMER                 = providers.TIMER,
      CUSTOM                = providers.CUSTOM,
      nodeRequire           = Module.prototype.require

let contextModel

const contexts = []

function currentContext() {
  return contexts[contexts.length - 1]
}

function contextGuarded(apiMethod) {
  return function() {
    const file = currentContext()

    if (file && contextModel) {
      return apiMethod.apply(ServerCode, arguments)
    } else {
      logger.error('ServerCode registration is allowed only synchronously during module load phase')
    }
  }
}

function addHandler(eventId, target, async, invoke) {
  const provider = currentContext().relativePath

  contextModel.addHandler({ eventId, target, async, invoke, provider })
}

class ServerCodeError extends Error {

  /**
   * @param {Number} code
   * @param {String} message
   * @param {Number=} httpStatusCode
   */
  constructor(code, message, httpStatusCode) {
    super(message)

    this.code = code
    this.message = message
    this.httpStatusCode = httpStatusCode
  }
}

/**
 * @namespace
 * @alias Backendless.ServerCode
 */
const ServerCode = {}

ServerCode.Error = ServerCodeError
ServerCode.PersistenceItem = PersistenceItem
ServerCode.verbose = () => logger.verbose = true

/**
 * @param {Function} type
 * @returns {Function} Passed type
 */
ServerCode.addType = contextGuarded(function(type, options) {
  if (!type || typeof type !== 'function' || !type.name) {
    throw new Error('A type must be a named function-constructor or es6 class')
  }

  contextModel.addType(type, currentContext(), options)

  return type
})

/**
 * @typedef {String|Number|Date} DateTime
 */

/**
 * @typedef {Object} Timer
 * @param {String} timer.name
 * @param {?DateTime} timer.startDate
 * @param {Object} timer.frequency
 * @param {?DateTime} timer.expire
 */

/**
 * @name Backendless.ServerCode.addTimer
 *
 * @param {Timer} timer
 */
ServerCode.addTimer = contextGuarded(function(timer) {
  const event = TIMER.events.execute
  const fileName = currentContext().relativePath
  const invoke = timer[event.name]
  const name = timer.name || timer.name || path.basename(fileName, '.js')
  const frequency = timer.frequency || {}
  const schedule = frequency.schedule
  const expire = timer.expire

  if (!invoke) {
    throw new Error(`${name} timer must contain [${event.name}}] method`)
  }

  let startDate = timer.startDate
  const now = new Date().getTime()

  if (startDate == null) {
    const singleTick = schedule === 'once'

    if (singleTick) {
      throw new Error(`${name} timer is scheduled to run only once but its [startDate] is not specified`)
    } else {
      startDate = now
    }
  }

  const timerJson = JSON.stringify({ name, startDate, expire, frequency })
  const provider = currentContext().relativePath

  contextModel.addTimer({ name, provider, timerJson, invoke })
})

/**
 * @param {String} eventName
 * @param {Function} handler
 * @param {Boolean} async
 */
ServerCode.customEvent = contextGuarded((eventName, handler, async) => {
  addHandler(CUSTOM.events.execute.id, eventName, async, handler)
})

/**
 * @param {Function} service
 * @returns {Function} Passed service
 */
ServerCode.addService = contextGuarded((service, configItems, options) => {
  if (!service || typeof service !== 'function' || !service.name) {
    throw new Error('A Service must be a named function-constructor or es6 class')
  }

  if (configItems) {
    service.configItems = configItems
  }

  contextModel.addService(service, currentContext(), options)

  return service
})

ServerCode.ConfigItems = {}
ServerCode.ConfigItems.TYPES = {
  STRING: 'string',
  BOOL  : 'bool',
  DATE  : 'date',
  CHOICE: 'choice'
}

// It tempts to generate all these handlers dynamically but in that case user's IDE won't be able
// to perform some code completion

ServerCode.Persistence = ServerCode.Data = {
  beforeCreate        : handlerRegistrar(PERSISTENCE.events.beforeCreate),
  afterCreate         : handlerRegistrar(PERSISTENCE.events.afterCreate),
  beforeFindById      : handlerRegistrar(PERSISTENCE.events.beforeFindById),
  afterFindById       : handlerRegistrar(PERSISTENCE.events.afterFindById),
  beforeLoadRelations : handlerRegistrar(PERSISTENCE.events.beforeLoadRelations),
  afterLoadRelations  : handlerRegistrar(PERSISTENCE.events.afterLoadRelations),
  beforeRemove        : handlerRegistrar(PERSISTENCE.events.beforeRemove),
  afterRemove         : handlerRegistrar(PERSISTENCE.events.afterRemove),
  beforeUpdate        : handlerRegistrar(PERSISTENCE.events.beforeUpdate),
  afterUpdate         : handlerRegistrar(PERSISTENCE.events.afterUpdate),
  beforeDescribe      : handlerRegistrar(PERSISTENCE.events.beforeDescribe),
  afterDescribe       : handlerRegistrar(PERSISTENCE.events.afterDescribe),
  beforeFind          : handlerRegistrar(PERSISTENCE.events.beforeFind),
  afterFind           : handlerRegistrar(PERSISTENCE.events.afterFind),
  beforeFirst         : handlerRegistrar(PERSISTENCE.events.beforeFirst),
  afterFirst          : handlerRegistrar(PERSISTENCE.events.afterFirst),
  beforeLast          : handlerRegistrar(PERSISTENCE.events.beforeLast),
  afterLast           : handlerRegistrar(PERSISTENCE.events.afterLast),
  beforeCreateBulk    : handlerRegistrar(PERSISTENCE.events.beforeCreateBulk),
  afterCreateBulk     : handlerRegistrar(PERSISTENCE.events.afterCreateBulk),
  beforeUpdateBulk    : handlerRegistrar(PERSISTENCE.events.beforeUpdateBulk),
  afterUpdateBulk     : handlerRegistrar(PERSISTENCE.events.afterUpdateBulk),
  beforeRemoveBulk    : handlerRegistrar(PERSISTENCE.events.beforeRemoveBulk),
  afterRemoveBulk     : handlerRegistrar(PERSISTENCE.events.afterRemoveBulk),
  beforeCount         : handlerRegistrar(PERSISTENCE.events.beforeCount),
  afterCount          : handlerRegistrar(PERSISTENCE.events.afterCount),
  beforeAddRelation   : handlerRegistrar(PERSISTENCE.events.beforeAddRelation),
  afterAddRelation    : handlerRegistrar(PERSISTENCE.events.afterAddRelation),
  beforeSetRelation   : handlerRegistrar(PERSISTENCE.events.beforeSetRelation),
  afterSetRelation    : handlerRegistrar(PERSISTENCE.events.afterSetRelation),
  beforeDeleteRelation: handlerRegistrar(PERSISTENCE.events.beforeDeleteRelation),
  afterDeleteRelation : handlerRegistrar(PERSISTENCE.events.afterDeleteRelation),
}

ServerCode.User = {
  beforeLogin          : handlerRegistrar(USER.events.beforeLogin),
  afterLogin           : handlerRegistrar(USER.events.afterLogin),
  beforeRegister       : handlerRegistrar(USER.events.beforeRegister),
  afterRegister        : handlerRegistrar(USER.events.afterRegister),
  beforeUpdate         : handlerRegistrar(USER.events.beforeUpdate),
  afterUpdate          : handlerRegistrar(USER.events.afterUpdate),
  beforeRemove         : handlerRegistrar(USER.events.beforeRemove),
  afterRemove          : handlerRegistrar(USER.events.afterRemove),
  beforeDescribe       : handlerRegistrar(USER.events.beforeDescribe),
  afterDescribe        : handlerRegistrar(USER.events.afterDescribe),
  beforeRestorePassword: handlerRegistrar(USER.events.beforeRestorePassword),
  afterRestorePassword : handlerRegistrar(USER.events.afterRestorePassword),
  beforeLogout         : handlerRegistrar(USER.events.beforeLogout),
  afterLogout          : handlerRegistrar(USER.events.afterLogout),
  beforeFind           : handlerRegistrar(USER.events.beforeFind),
  afterFind            : handlerRegistrar(USER.events.afterFind),
  beforeFindById       : handlerRegistrar(USER.events.beforeFindById),
  afterFindById        : handlerRegistrar(USER.events.afterFindById),
  beforeUpdateBulk     : handlerRegistrar(USER.events.beforeUpdateBulk),
  afterUpdateBulk      : handlerRegistrar(USER.events.afterUpdateBulk),
  beforeRemoveBulk     : handlerRegistrar(USER.events.beforeRemoveBulk),
  afterRemoveBulk      : handlerRegistrar(USER.events.afterRemoveBulk),
  beforeEmailConfirmed : handlerRegistrar(USER.events.beforeEmailConfirmed),
  afterEmailConfirmed  : handlerRegistrar(USER.events.afterEmailConfirmed),
  beforeSocialLogin    : handlerRegistrar(USER.events.beforeSocialLogin),
  afterSocialLogin     : handlerRegistrar(USER.events.afterSocialLogin),
  beforeSocialRegister : handlerRegistrar(USER.events.beforeSocialRegister),
  afterSocialRegister  : handlerRegistrar(USER.events.afterSocialRegister)
}

ServerCode.Media = {
  acceptConnection: handlerRegistrar(MEDIA.events.acceptConnection),
  publishStarted  : handlerRegistrar(MEDIA.events.publishStarted),
  publishFinished : handlerRegistrar(MEDIA.events.publishFinished),
  streamCreated   : handlerRegistrar(MEDIA.events.streamCreated),
  streamFinished  : handlerRegistrar(MEDIA.events.streamFinished)
}

ServerCode.Geo = {
  beforeAddPoint      : handlerRegistrar(GEO.events.beforeAddPoint),
  afterAddPoint       : handlerRegistrar(GEO.events.afterAddPoint),
  beforeUpdatePoint   : handlerRegistrar(GEO.events.beforeUpdatePoint),
  afterUpdatePoint    : handlerRegistrar(GEO.events.afterUpdatePoint),
  beforeRemovePoint   : handlerRegistrar(GEO.events.beforeRemovePoint),
  afterRemovePoint    : handlerRegistrar(GEO.events.afterRemovePoint),
  beforeGetCategories : handlerRegistrar(GEO.events.beforeGetCategories),
  afterGetCategories  : handlerRegistrar(GEO.events.afterGetCategories),
  beforeGetPoints     : handlerRegistrar(GEO.events.beforeGetPoints),
  afterGetPoints      : handlerRegistrar(GEO.events.afterGetPoints),
  beforeAddCategory   : handlerRegistrar(GEO.events.beforeAddCategory),
  afterAddCategory    : handlerRegistrar(GEO.events.afterAddCategory),
  beforeDeleteCategory: handlerRegistrar(GEO.events.beforeDeleteCategory),
  afterDeleteCategory : handlerRegistrar(GEO.events.afterDeleteCategory),
  beforeRelativeFind  : handlerRegistrar(GEO.events.beforeRelativeFind),
  afterRelativeFind   : handlerRegistrar(GEO.events.afterRelativeFind)
}

ServerCode.Messaging = {
  beforePublish           : handlerRegistrar(MESSAGING.events.beforePublish),
  afterPublish            : handlerRegistrar(MESSAGING.events.afterPublish),
  beforeSubscribe         : handlerRegistrar(MESSAGING.events.beforeSubscribe),
  afterSubscribe          : handlerRegistrar(MESSAGING.events.afterSubscribe),
  beforeCancel            : handlerRegistrar(MESSAGING.events.beforeCancel),
  afterCancel             : handlerRegistrar(MESSAGING.events.afterCancel),
  beforePoll              : handlerRegistrar(MESSAGING.events.beforePoll),
  afterPoll               : handlerRegistrar(MESSAGING.events.afterPoll),
  beforeDeviceRegistration: handlerRegistrar(MESSAGING.events.beforeDeviceRegistration),
  afterDeviceRegistration : handlerRegistrar(MESSAGING.events.afterDeviceRegistration),
  beforeSendEmail         : handlerRegistrar(MESSAGING.events.beforeSendEmail),
  afterSendEmail          : handlerRegistrar(MESSAGING.events.afterSendEmail),
  beforeGetMessageStatus  : handlerRegistrar(MESSAGING.events.beforeGetMessageStatus),
  afterGetMessageStatus   : handlerRegistrar(MESSAGING.events.afterGetMessageStatus),
  beforePush              : handlerRegistrar(MESSAGING.events.beforePush),
  afterPush               : handlerRegistrar(MESSAGING.events.afterPush),
  beforePushWithTemplate  : handlerRegistrar(MESSAGING.events.beforePushWithTemplate),
  afterPushWithTemplate   : handlerRegistrar(MESSAGING.events.afterPushWithTemplate),
}

ServerCode.File = {
  beforeUpload               : handlerRegistrar(FILE.events.beforeUpload),
  afterUpload                : handlerRegistrar(FILE.events.afterUpload),
  beforeCount                : handlerRegistrar(FILE.events.beforeCount),
  afterCount                 : handlerRegistrar(FILE.events.afterCount),
  beforeListing              : handlerRegistrar(FILE.events.beforeListing),
  afterListing               : handlerRegistrar(FILE.events.afterListing),
  beforeExists               : handlerRegistrar(FILE.events.beforeExists),
  afterExists                : handlerRegistrar(FILE.events.afterExists),
  beforeDeleteFileOrDirectory: handlerRegistrar(FILE.events.beforeDeleteFileOrDirectory),
  afterDeleteFileOrDirectory : handlerRegistrar(FILE.events.afterDeleteFileOrDirectory),
  beforeSaveFileFromByteArray: handlerRegistrar(FILE.events.beforeSaveFileFromByteArray),
  afterSaveFileFromByteArray : handlerRegistrar(FILE.events.afterSaveFileFromByteArray),
  beforeCopyFileOrDirectory  : handlerRegistrar(FILE.events.beforeCopyFileOrDirectory),
  afterCopyFileOrDirectory   : handlerRegistrar(FILE.events.afterCopyFileOrDirectory),
  beforeMoveFileOrDirectory  : handlerRegistrar(FILE.events.beforeMoveFileOrDirectory),
  afterMoveFileOrDirectory   : handlerRegistrar(FILE.events.afterMoveFileOrDirectory),

  /* @deprecated Use ServerCode.File.beforeUpload */
  beforeMoveToRepository: handlerRegistrar(FILE.events.beforeUpload),
  /* @deprecated Use ServerCode.File.afterUpload */
  afterMoveToRepository : handlerRegistrar(FILE.events.afterUpload)
}

function handlerRegistrar(event) {
  return function() {
    const targeted = typeof arguments[0] !== 'function'

    const target = targeted ? arguments[0] : '*'
    const handler = arguments[targeted ? 1 : 0]
    const async = !!arguments[targeted ? 2 : 1]

    addHandler(event.id, target, async, handler)
  }
}

ServerCode.load = function(basePath, exclude, model, files) {
  contextModel = model

  if (!files) {
    files = serverCodeFilesInPath(basePath, exclude)
  }

  Module.prototype.require = contextifyRequire(basePath)

  files.forEach(file => {
    const filePath = path.resolve(basePath, file)
    const relativePath = path.relative(basePath, filePath)

    logger.debug(`Reading ${relativePath}...`)

    try {
      require(filePath)
    } catch (e) {
      logger.debug(e.stack)

      const erredFile = e.file ? e.file : { absolutePath: file }
      const position = extractContextPositionFromError(e, erredFile.absolutePath)

      contextModel.addError({ message: e.message, position }, file, erredFile.relativePath)
      contexts.splice(0)
    }
  })

  Module.prototype.require = nodeRequire

  contextModel = null
}

function extractContextPositionFromError(e, contextFile) {
  const matches = e.stack.match(new RegExp('.*' + contextFile + ':(.*[^\\)])[\\)\\n]'))
  return matches && matches.length && matches[1]
}

function contextifyRequire(basePath) {
  return function(modulePath) {
    if (modulePath === 'backendless') {
      return Backendless
    }

    let absolutePath
    let result

    try {
      absolutePath = Module._resolveFilename(modulePath, this)
    } catch (e) {
      absolutePath = modulePath
    }

    const relativePath = absolutePath.startsWith(basePath)
      ? absolutePath.substring(basePath.length + 1)
      : absolutePath

    const context = { absolutePath, relativePath }
    contexts.push(context)

    try {
      result = nodeRequire.call(this, modulePath)
    } catch (e) {
      e.file = context
      throw e
    } finally {
      contexts.pop()
    }

    return result
  }
}

module.exports = ServerCode