'use strict'

const supertest = require('supertest')

/**
 * @param {Object} app
 * @returns {Function.<Test>}
 */
module.exports = function(app) {

  /**
   * @param {String} method
   * @param {String} path
   * @param {Object=} body
   * @returns {Test}
   */
  return function(method, path, body) {
    const result = supertest(`${app.server}/${app.id}/${app.restKey}`)[method](path)
    
    if (body) {
      result.send(body)
    }
    
    return result
  }
}