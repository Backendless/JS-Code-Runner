/* eslint-disable max-len */

'use strict'

const Backendless = require('backendless')

class EventType {
  constructor(id, name, provider, args) {
    Object.assign(this, { id, name, provider, args })
  }

  addResultWrapper(resultWrapper) {
    this.resultWrapper = resultWrapper

    return this
  }

  addArgumentTransformer(argumentTransformer) {
    this.argumentTransformer = argumentTransformer

    return this
  }

  addDeprecation(deprecatedMsg) {
    this.deprecatedMsg = typeof deprecatedMsg === 'function' ? deprecatedMsg(this) : deprecatedMsg

    return this
  }
}

class EventProvider {
  constructor(id, targeted) {
    this.id = id
    this.targeted = targeted
    this.events = {}
  }
}

/**
 * @type {Object.<number, EventType>}
 */
const events = {}

const PERSISTENCE      = new EventProvider('persistence', true),
      TIMER            = new EventProvider('timer', false),
      MEDIA            = new EventProvider('media', false),
      MESSAGING        = new EventProvider('messaging', true),
      USER             = new EventProvider('user', false),
      FILE             = new EventProvider('file', false),
      CACHE            = new EventProvider('cache', false),
      ATOMIC_OPERATION = new EventProvider('atomic-operation', false),
      GEO              = new EventProvider('geo', true),
      CUSTOM           = new EventProvider('custom', true)

function addEvent(id, name, provider, args) {
  return events[id] = provider.events[name] = new EventType(id, name, provider, args)
}

//Data (Persistence Service) Events
addEvent(100, 'beforeCreate', PERSISTENCE, ['item'])
addEvent(101, 'afterCreate', PERSISTENCE, ['item', 'result'])
addEvent(102, 'beforeFindById', PERSISTENCE, ['itemId', 'relations'])
addEvent(103, 'afterFindById', PERSISTENCE, ['itemId', 'relations', 'result'])
addEvent(104, 'beforeLoadRelations', PERSISTENCE, ['itemId', 'entityName', 'relationName', 'pageSize', 'offset'])
addEvent(105, 'afterLoadRelations', PERSISTENCE, ['itemId', 'entityName', 'relationName', 'pageSize', 'offset', 'result'])
addEvent(106, 'beforeRemove', PERSISTENCE, ['itemId'])
addEvent(107, 'afterRemove', PERSISTENCE, ['itemId', 'result'])
addEvent(108, 'beforeUpdate', PERSISTENCE, ['item'])
addEvent(109, 'afterUpdate', PERSISTENCE, ['item', 'result'])
addEvent(110, 'beforeDescribe', PERSISTENCE, ['itemName'])
addEvent(111, 'afterDescribe', PERSISTENCE, ['itemName', 'result'])
addEvent(112, 'beforeFind', PERSISTENCE, ['query'])
addEvent(113, 'afterFind', PERSISTENCE, ['query', 'result'])
addEvent(114, 'beforeFirst', PERSISTENCE, ['relations', 'relationsDepth', 'properties'])
addEvent(115, 'afterFirst', PERSISTENCE, ['relations', 'relationsDepth', 'properties', 'result'])
addEvent(116, 'beforeLast', PERSISTENCE, ['relations', 'relationsDepth', 'properties'])
addEvent(117, 'afterLast', PERSISTENCE, ['relations', 'relationsDepth', 'properties', 'result'])
addEvent(130, 'beforeCreateBulk', PERSISTENCE, ['items'])
addEvent(131, 'afterCreateBulk', PERSISTENCE, ['items', 'result'])
addEvent(118, 'beforeUpdateBulk', PERSISTENCE, ['tableName', 'whereClause', 'changes'])
addEvent(119, 'afterUpdateBulk', PERSISTENCE, ['tableName', 'whereClause', 'changes', 'result'])
addEvent(120, 'beforeRemoveBulk', PERSISTENCE, ['tableName', 'whereClause'])
addEvent(121, 'afterRemoveBulk', PERSISTENCE, ['tableName', 'whereClause', 'result'])
addEvent(122, 'beforeAddRelation', PERSISTENCE, ['columnName', 'parentObjectId', 'childrenArrayORWhereClause'])
addEvent(123, 'afterAddRelation', PERSISTENCE, ['columnName', 'parentObjectId', 'childrenArrayORWhereClause', 'result'])
addEvent(124, 'beforeSetRelation', PERSISTENCE, ['columnName', 'parentObjectId', 'childrenArrayORWhereClause'])
addEvent(125, 'afterSetRelation', PERSISTENCE, ['columnName', 'parentObjectId', 'childrenArrayORWhereClause', 'result'])
addEvent(126, 'beforeDeleteRelation', PERSISTENCE, ['columnName', 'parentObjectId', 'childrenArrayORWhereClause'])
addEvent(127, 'afterDeleteRelation', PERSISTENCE, ['columnName', 'parentObjectId', 'childrenArrayORWhereClause', 'result'])
addEvent(128, 'beforeCount', PERSISTENCE, ['query'])
addEvent(129, 'afterCount', PERSISTENCE, ['query', 'result'])

addEvent(134, 'beforeTransaction', PERSISTENCE, ['unitOfWork'])
  .addArgumentTransformer((req) => {
    if (req.unitOfWork) {
      req.unitOfWork = Backendless.UnitOfWork.initFromJSON(req.unitOfWork)
    }
  })

addEvent(135, 'afterTransaction', PERSISTENCE, ['unitOfWork', 'result'])
  .addArgumentTransformer((req, res) => {
    if (req.unitOfWork) {
      req.unitOfWork = Backendless.UnitOfWork.initFromJSON(req.unitOfWork)

      if (res.result) {
        req.unitOfWork.setResult(res.result)
      }
    }
  })

addEvent(136, 'beforeGroup', PERSISTENCE, ['query'])
addEvent(137, 'afterGroup', PERSISTENCE, ['query', 'result'])
addEvent(138, 'beforeCountInGroup', PERSISTENCE, ['query'])
addEvent(139, 'afterCountInGroup', PERSISTENCE, ['query', 'result'])
addEvent(140, 'beforeUpsert', PERSISTENCE, ['item'])
addEvent(141, 'afterUpsert', PERSISTENCE, ['item', 'result'])
addEvent(142, 'beforeUpsertBulk', PERSISTENCE, ['items'])
addEvent(143, 'afterUpsertBulk', PERSISTENCE, ['items', 'result'])

//User Events
addEvent(200, 'beforeLogin', USER, ['login', 'password'])
addEvent(201, 'afterLogin', USER, ['login', 'password', 'result'])
addEvent(202, 'beforeRegister', USER, ['user'])
addEvent(203, 'afterRegister', USER, ['user', 'result'])
addEvent(204, 'beforeUpdate', USER, ['user'])
addEvent(205, 'afterUpdate', USER, ['user', 'result'])
addEvent(206, 'beforeRemove', USER, ['userId'])
addEvent(207, 'afterRemove', USER, ['userId', 'result'])
addEvent(208, 'beforeDescribe', USER, [])
addEvent(209, 'afterDescribe', USER, ['result'])
addEvent(210, 'beforeRestorePassword', USER, ['email'])
addEvent(211, 'afterRestorePassword', USER, ['email', 'result'])
addEvent(212, 'beforeLogout', USER, [])
addEvent(213, 'afterLogout', USER, ['result'])
addEvent(214, 'beforeFind', USER, ['query'])
addEvent(215, 'afterFind', USER, ['query', 'result'])
addEvent(216, 'beforeFindById', USER, ['userId', 'relations'])
addEvent(217, 'afterFindById', USER, ['userId', 'relations', 'result'])
addEvent(218, 'beforeUpdateBulk', USER, ['whereClause', 'changes'])
addEvent(219, 'afterUpdateBulk', USER, ['whereClause', 'changes', 'result'])
addEvent(220, 'beforeRemoveBulk', USER, ['whereClause'])
addEvent(221, 'afterRemoveBulk', USER, ['whereClause', 'result'])
addEvent(222, 'beforeEmailConfirmed', USER, ['confirmationKey'])
addEvent(223, 'afterEmailConfirmed', USER, ['confirmationKey', 'result'])
addEvent(224, 'beforeSocialLogin', USER, ['userProperties', 'socialType'])
addEvent(225, 'afterSocialLogin', USER, ['userProperties', 'socialType', 'result'])
addEvent(226, 'beforeSocialRegister', USER, ['userProperties', 'socialType'])
addEvent(227, 'afterSocialRegister', USER, ['userProperties', 'socialType', 'result'])
addEvent(228, 'beforeLoginAsGuest', USER, [])
addEvent(229, 'afterLoginAsGuest', USER, ['result'])
addEvent(230, 'beforeOAuthLogin', USER, ['userProperties', 'oauthProviderCode'])
addEvent(231, 'afterOAuthLogin', USER, ['userProperties', 'oauthProviderCode', 'result'])
addEvent(232, 'beforeOAuthRegister', USER, ['userProperties', 'oauthProviderCode'])
addEvent(233, 'afterOAuthRegister', USER, ['userProperties', 'oauthProviderCode', 'result'])
addEvent(234, 'beforeGroup', USER, ['query'])
addEvent(235, 'afterGroup', USER, ['query', 'result'])
addEvent(236, 'beforeUpsert', USER, [])
addEvent(237, 'afterUpsert', USER, ['result'])

const DEPRECATED_GEO_MSG = event => (
  'Legacy GEO API are deprecated and will be removed in the nearest release. ' +
  `Remove the "${ event.name }" event handler to avoid any errors in the future. ` +
  'Please use Spatial Data Types [POINT,LINESTRING,POLYGON]. ' +
  'See more details here: https://backendless.com/docs/js/data_spatial_overview.html '
)

//Geo Service Events
addEvent(402, 'beforeAddPoint', GEO, ['point']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(403, 'afterAddPoint', GEO, ['point', 'result']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(404, 'beforeUpdatePoint', GEO, ['point']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(405, 'afterUpdatePoint', GEO, ['point', 'result']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(406, 'beforeRemovePoint', GEO, ['pointId']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(407, 'afterRemovePoint', GEO, ['pointId', 'result']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(408, 'beforeGetCategories', GEO, []).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(409, 'afterGetCategories', GEO, ['result']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(410, 'beforeGetPoints', GEO, ['query']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(411, 'afterGetPoints', GEO, ['query', 'result']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(412, 'beforeAddCategory', GEO, ['categoryName']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(413, 'afterAddCategory', GEO, ['categoryName', 'result']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(414, 'beforeDeleteCategory', GEO, ['categoryName']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(415, 'afterDeleteCategory', GEO, ['categoryName', 'result']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(416, 'beforeRelativeFind', GEO, ['query']).addDeprecation(DEPRECATED_GEO_MSG)
addEvent(417, 'afterRelativeFind', GEO, ['query', 'result']).addDeprecation(DEPRECATED_GEO_MSG)

//Messaging Events
addEvent(500, 'beforePublish', MESSAGING, ['message', 'publishOptions', 'deliveryOptions'])
addEvent(501, 'afterPublish', MESSAGING, ['message', 'publishOptions', 'deliveryOptions', 'result'])
addEvent(502, 'beforeSubscribe', MESSAGING, ['channel', 'options'])
addEvent(503, 'afterSubscribe', MESSAGING, ['channel', 'options', 'result'])
addEvent(504, 'beforeCancel', MESSAGING, ['messageId'])
addEvent(505, 'afterCancel', MESSAGING, ['messageId', 'result'])
addEvent(506, 'beforePoll', MESSAGING, ['messageId'])
addEvent(507, 'afterPoll', MESSAGING, ['messageId', 'result'])
addEvent(508, 'beforePush', MESSAGING, ['templateDescription'])
addEvent(509, 'afterPush', MESSAGING, ['templateDescription', 'result'])
addEvent(510, 'beforePushWithTemplate', MESSAGING, ['templateName'])
addEvent(511, 'afterPushWithTemplate', MESSAGING, ['templateName', 'result'])
addEvent(512, 'beforeDeviceRegistration', MESSAGING, ['registration'])
addEvent(513, 'afterDeviceRegistration', MESSAGING, ['registration', 'result'])
addEvent(514, 'beforeSendEmail', MESSAGING, ['subject', 'bodyParts', 'recipients', 'attachments'])
addEvent(515, 'afterSendEmail', MESSAGING, ['subject', 'bodyParts', 'recipients', 'attachments', 'result'])
addEvent(516, 'beforeGetMessageStatus', MESSAGING, ['messageId'])
addEvent(517, 'afterGetMessageStatus', MESSAGING, ['messageId', 'result'])
addEvent(518, 'beforeSendEmailFromTemplate', MESSAGING, ['templateName', 'envelope', 'templateValues'])
addEvent(519, 'afterSendEmailFromTemplate', MESSAGING, ['templateName', 'envelope', 'templateValues', 'result'])

//File Service Events
addEvent(600, 'beforeUpload', FILE, ['fileURL'])
addEvent(601, 'afterUpload', FILE, ['fileURL', 'result'])
addEvent(602, 'beforeDeleteFileOrDirectory', FILE, ['fileURL', 'pattern', 'recursive'])
addEvent(603, 'afterDeleteFileOrDirectory', FILE, ['fileURL', 'pattern', 'recursive', 'result'])
addEvent(604, 'beforeSaveFileFromByteArray', FILE, ['fileURL', 'overwrite'])
addEvent(605, 'afterSaveFileFromByteArray', FILE, ['fileURL', 'overwrite', 'result'])
addEvent(606, 'beforeCopyFileOrDirectory', FILE, ['source', 'target'])
addEvent(607, 'afterCopyFileOrDirectory', FILE, ['source', 'target', 'result'])
addEvent(608, 'beforeMoveFileOrDirectory', FILE, ['source', 'target'])
addEvent(609, 'afterMoveFileOrDirectory', FILE, ['source', 'target', 'result'])

addEvent(610, 'beforeCount', FILE, ['path', 'pattern', 'recursive', 'isCountDirectories'])
addEvent(611, 'afterCount', FILE, ['path', 'pattern', 'recursive', 'isCountDirectories', 'result'])

addEvent(612, 'beforeListing', FILE, ['path', 'pattern', 'recursive', 'pageSize', 'offset'])
addEvent(613, 'afterListing', FILE, ['path', 'pattern', 'recursive', 'pageSize', 'offset', 'result'])

addEvent(614, 'beforeExists', FILE, ['path'])
addEvent(615, 'afterExists', FILE, ['path', 'result'])

addEvent(618, 'beforeDownload', FILE, ['fileURL', 'result'])
  .addResultWrapper((error, result, { name: eventName }) => {
    if (result === undefined) {
      return result
    }

    if (typeof (result && result.fileURL) === 'string') {
      return { result: result.fileURL }
    }

    if (typeof result === 'string') {
      result = Buffer.from(result, 'utf8')
    }

    if (Buffer.isBuffer(result)) {
      return { result: [...result.values()] }
    }

    throw new Error(
      `The "${ eventName }" handler has wrong result type. Valid result types: ` +
      'Buffer, String (the file content), Object { fileURL: [string] }'
    )
  })

//Cache
addEvent(1001, 'beforePut', CACHE, ['key', 'value', 'ttl'])
addEvent(1002, 'afterPut', CACHE, ['key', 'value', 'ttl', 'result'])
addEvent(1003, 'beforeGet', CACHE, ['key'])
addEvent(1004, 'afterGet', CACHE, ['key', 'result'])
addEvent(1005, 'beforeContains', CACHE, ['key'])
addEvent(1006, 'afterContains', CACHE, ['key', 'result'])
addEvent(1007, 'beforeExpireAt', CACHE, ['key', 'expireAt'])
addEvent(1008, 'afterExpireAt', CACHE, ['key', 'expireAt', 'result'])
addEvent(1009, 'beforeExpireIn', CACHE, ['key', 'expireIn'])
addEvent(1010, 'afterExpireIn', CACHE, ['key', 'expireIn', 'result'])
addEvent(1011, 'beforeDelete', CACHE, ['key'])
addEvent(1012, 'afterDelete', CACHE, ['key', 'result'])

//AtomicOperation
addEvent(1201, 'beforeReset', ATOMIC_OPERATION, ['counterName'])
addEvent(1202, 'afterReset', ATOMIC_OPERATION, ['counterName', 'result'])
addEvent(1203, 'beforeGetAndIncrement', ATOMIC_OPERATION, ['counterName'])
addEvent(1204, 'afterGetAndIncrement', ATOMIC_OPERATION, ['counterName', 'result'])
addEvent(1205, 'beforeIncrementAndGet', ATOMIC_OPERATION, ['counterName'])
addEvent(1206, 'afterIncrementAndGet', ATOMIC_OPERATION, ['counterName', 'result'])
addEvent(1207, 'beforeGetAndDecrement', ATOMIC_OPERATION, ['counterName'])
addEvent(1208, 'afterGetAndDecrement', ATOMIC_OPERATION, ['counterName', 'result'])
addEvent(1209, 'beforeDecrementAndGet', ATOMIC_OPERATION, ['counterName'])
addEvent(1210, 'afterDecrementAndGet', ATOMIC_OPERATION, ['counterName', 'result'])
addEvent(1211, 'beforeAddAndGet', ATOMIC_OPERATION, ['counterName', 'value'])
addEvent(1212, 'afterAddAndGet', ATOMIC_OPERATION, ['counterName', 'value', 'result'])
addEvent(1213, 'beforeGetAndAdd', ATOMIC_OPERATION, ['counterName', 'value'])
addEvent(1214, 'afterGetAndAdd', ATOMIC_OPERATION, ['counterName', 'value', 'result'])
addEvent(1215, 'beforeGet', ATOMIC_OPERATION, ['counterName'])
addEvent(1216, 'afterGet', ATOMIC_OPERATION, ['counterName', 'result'])
addEvent(1217, 'beforeCompareAndSet', ATOMIC_OPERATION, ['counterName', 'expected', 'updated'])
addEvent(1218, 'afterCompareAndSet', ATOMIC_OPERATION, ['counterName', 'expected', 'updated', 'result'])
addEvent(1219, 'beforeList', ATOMIC_OPERATION, ['pattern'])
addEvent(1220, 'afterList', ATOMIC_OPERATION, ['pattern', 'result'])

//Timer Events
addEvent(800, 'execute', TIMER, [])

//Custom Events
addEvent(900, 'execute', CUSTOM, ['args', 'result'])
  .addResultWrapper((error, result) => {
    return Object.prototype.toString.call(result).slice(8, -1) === 'Object'
      ? result
      : { result }
  })

module.exports = {
  /**
   * @type {Object.<string, EventProvider>}
   */
  providers: { PERSISTENCE, TIMER, MEDIA, MESSAGING, USER, FILE, CACHE, ATOMIC_OPERATION, GEO, CUSTOM },

  /**
   * @param {number} id Event Id
   * @returns {EventType}
   */
  get(id) {
    return events[id]
  }
}
