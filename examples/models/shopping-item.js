'use strict'

/**
 * @property {String} objectId
 * @property {String} product
 * @property {Number} price
 * @property {Number} quantity
 */
class ShoppingItem extends Backendless.ServerCode.PersistenceItem {

}

module.exports = Backendless.ServerCode.addType(ShoppingItem)