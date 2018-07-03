'use strict'

const Backendless = require('backendless')

const isPersistable = value =>
  value instanceof PersistenceItem ||
  value instanceof Backendless.GeoPoint

const isArray = value => Array.isArray(value)

const isEmptyArray = value => isArray(value) && value.length === 0

const isArrayOfPersistable = value => {
  if (!isArray(value) || value.length === 0) {
    return false
  }

  for (let i = 0; i < value.length; i++) {
    if (!isPersistable(value[i])) {
      return false
    }
  }

  return true
}

const trimRelations = item => {
  const result = {}

  Object.keys(item).forEach(key => {
    const value = item[key]

    if (isPersistable(value) || isArray(value)) {
      return
    }

    result[key] = value
  })

  return result
}

const SYSTEM_PROPS = ['objectId', 'ownerId', 'created', 'updated', '___class', '___jsonclass']

const queryToBuilder = query => {
  if (query instanceof Backendless.DataQueryBuilder) {
    return query
  }

  if (typeof query === 'string') {
    return Backendless.DataQueryBuilder.create().setWhereClause(query)
  }

  const result = Backendless.DataQueryBuilder.create()

  if (query) {
    const { condition, properties, options } = query

    condition && (result.setWhereClause(condition))
    properties && (result.setProperties(properties))

    if (options) {
      options.pageSize && (result.setPageSize(options.pageSize))
      options.offset && (result.setOffset(options.offset))
      options.relations && (result.setRelated(options.relations))
      options.sortBy && (result.setSortBy(options.sortBy))
    }
  }

  return result
}

/**
 * @typedef {Object} PersistenceIten
 * @property {String} ownerId
 * @property {String} objectId
 * @property {Number} created
 * @property {Number} updated
 */
class PersistenceItem {
  constructor(args) {
    this.___class = this.constructor.name

    if (typeof args === 'string') {
      args = { objectId: args }
    }

    Object.assign(this, args)
  }

  /**
   * @param {String[]} [relations]
   * @param {String[]} [properties]
   * @returns {Promise.<PersistenceItem>}
   */
  fetch(relations, properties) {
    return this.constructor.findById(this.objectId, relations, properties)
  }

  /**
   * @returns {Promise}
   */
  save() {
    const payload = trimRelations(this)

    const hasCustomProps = !!Object.keys(payload).find(key =>
      payload[key] !== undefined && !SYSTEM_PROPS.includes(key))

    if (!payload.objectId || hasCustomProps || payload.ownerId !== undefined) {
      return this.dataStore.save(payload).then(saved => Object.assign(this, saved))
    }

    return Promise.resolve(this)
  }

  /**
   * @param {{stale: String[]}} [options]
   * @returns {Promise.<PersistenceItem>}
   */
  saveWithRelations(options = {}) {
    const { stale = [], deletable = [] } = options

    const childPath = (key, path) => {
      const prefix = `${key}.`

      return path
        .filter(s => s.startsWith(prefix))
        .map(s => s.substr(prefix.length))
    }

    return this.save().then(saved => {
      // eslint-disable-next-line no-shadow
      const saveItem = (item, stale, deletable) => {
        if (item instanceof PersistenceItem) {
          return item.saveWithRelations({ stale, deletable })
        }

        if (item instanceof Backendless.GeoPoint) {
          return Backendless.Geo.savePoint(item)
        }

        return item
      }

      const processField = (name, value) => {
        const setRelation = relation => {
          saved[name] = relation

          return saved.setRelation(name, relation)
        }

        if (isPersistable(value)) {
          return Promise.resolve()
            .then(() => {
              return stale.includes(name)
                ? value
                : saveItem(value, childPath(name, stale), childPath(name, deletable))
            })
            .then(setRelation)
        }

        if (isArrayOfPersistable(value)) {
          return Promise.resolve()
            .then(() => {
              return stale.includes(name)
                ? value
                : Promise.all(value.map(item => saveItem(item, childPath(name, stale), childPath(name, deletable))))
            })
            .then(setRelation)
        }

        if (deletable.includes(name) && (isEmptyArray(value) || value === null)) {
          return saved.deleteRelation(name, 'objectId is not null')
        }
      }

      return Promise.all(Object.keys(this).map(key => processField(key, this[key])))
        .then(() => saved)
    })
  }

  /**
   * Returns a new class instance with objectId and filtered set of properties
   *
   * @param {...String} propsToInclude - properties to include in the response
   * @returns {PersistenceItem}
   */
  ref(...propsToInclude) {
    const result = new this.constructor({ objectId: this.objectId })

    if (propsToInclude) {
      propsToInclude.forEach(propName => {
        result[propName] = this[propName]
      })
    }

    return result
  }

  /**
   * @returns {Promise}
   */
  remove() {
    return this.dataStore.remove(this)
  }

  /**
   * @param {String} columnName - A name of the column identifying the relation
   * @param {PersistenceItem|PersistenceItem[]|String} childrenOrWhereClause
   * @returns {Promise}
   */
  setRelation(columnName, childrenOrWhereClause) {
    if (isPersistable(childrenOrWhereClause)) {
      childrenOrWhereClause = [childrenOrWhereClause]
    }

    return this.dataStore.setRelation(this, columnName, childrenOrWhereClause)
  }

  /**
   * @param {String} columnName - A name of the column identifying the relation
   * @param {PersistenceItem|PersistenceItem[]|String} childrenOrWhereClause
   * @returns {Promise}
   */
  addRelation(columnName, childrenOrWhereClause) {
    if (isPersistable(childrenOrWhereClause)) {
      childrenOrWhereClause = [childrenOrWhereClause]
    }

    return this.dataStore.addRelation(this, columnName, childrenOrWhereClause)
  }

  /**
   * @param {String} columnName - A name of the column identifying the relation
   * @param {PersistenceItem|PersistenceItem[]|String} childrenOrWhereClause
   * @returns {Promise}
   */
  deleteRelation(columnName, childrenOrWhereClause) {
    if (isPersistable(childrenOrWhereClause)) {
      childrenOrWhereClause = [childrenOrWhereClause]
    }

    return this.dataStore.deleteRelation(this, columnName, childrenOrWhereClause)
  }

  /**
   * @private
   */
  get dataStore() {
    return Backendless.Persistence.of(this.constructor)
  }

  /**
   * @private
   */
  static get dataStore() {
    return Backendless.Persistence.of(this)
  }

  /**
   * @param {String} condition
   * @returns {Promise}
   */
  static count(condition) {
    return this.dataStore.getObjectCount(condition)
  }

  /**
   * @param {Object} obj
   * @returns {Promise.<PersistenceItem>}
   */
  static save(obj) {
    return new this(obj).save()
  }

  /**
   * @param {Object} obj
   * @param {Object} [opts]
   * @returns {Promise.<PersistenceItem>}
   */
  static saveWithRelations(obj, opts) {
    return new this(obj).saveWithRelations(opts)
  }

  /**
   * @param {Backendless.DataQuery|Object|String} query
   * @returns {Promise.<PersistenceItem[]>}
   */
  static find(query) {
    return this.dataStore.find(queryToBuilder(query))
  }

  /**
   * @param {String} objectId
   * @param {String[]} [relations]
   * @param {String[]} [properties]
   * @returns {Promise.<PersistenceItem>}
   */
  static findById(objectId, relations, properties) {
    if (!objectId) {
      return Promise.reject(new Error('objectId is not defined'))
    }

    return this.dataStore.findById(objectId, {
      options: { relations },
      properties
    })
  }

  /**
   * @returns {Promise}
   */
  static findFirst() {
    return this.dataStore.findFirst()
  }

  /**
   * @returns {Promise}
   */
  static findLast() {
    return this.dataStore.findLast()
  }

  /**
   * @param {Object|String} obj An object or objectId for deletion
   * @returns {Promise}
   */
  static remove(obj) {
    return this.dataStore.remove(obj)
  }

  /**
   * @param {Array<Object>} items
   * @returns {Promise}
   */
  static bulkCreate(items) {
    return this.dataStore.bulkCreate(items)
  }

  /**
   * @param {String} whereClause
   * @param {Object} changes
   * @returns {Promise}
   */
  static bulkUpdate(whereClause, changes) {
    return this.dataStore.bulkUpdate(whereClause, changes)
  }

  /**
   * @param {String|Array<Object|String>} whereClause whereClause or an array of objects/objectIds for deletion
   * @returns {Promise}
   */
  static bulkDelete(whereClause) {
    return this.dataStore.bulkDelete(whereClause)
  }
}

module.exports = PersistenceItem