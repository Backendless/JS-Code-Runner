'use strict'

class Order extends Backendless.ServerCode.PersistenceItem {
  constructor(items) {
    super()
    
    /**
     * @type {Array.<ShoppingItem>}
     */
    this.items = items

    /**
     * @type {Number}
     */
    this.orderPrice = items.reduce((sum, item) => (sum || 0) + (item.price * item.quantity))
  }
}

class ShoppingCart {
  constructor() {
    this.items = []
  }

  addItem(item) {
    this.items.push(item)
  }

  getItems() {
    return this.items
  }
}

class ShoppingCartService {

  /**
   * @typedef {Object} ShoppingItem
   * @property {String} objectId
   * @property {String} product
   * @property {Number} price
   * @property {Number} quantity
   */

  /**
   * @public
   * @param {String} cartName
   * @param {ShoppingItem} item
   * @returns {void}
   */
  addItem(cartName, item) {
    let shoppingCart = this.getCart(cartName)

    if (!shoppingCart) {
      shoppingCart = new ShoppingCart()
    }

    shoppingCart.addItem(item)
    item.objectId = null

    Backendless.Cache.put(cartName, shoppingCart)
  }

  /**
   * @public
   * @param {String} cartName
   * @param {Array.<ShoppingItem>} items
   * @returns {void}
   */
  addItems(cartName, items) {
    items.forEach(item => this.addItem(cartName, item))
  }
  
  /**
   * @public
   * @param {String} cartName
   * @returns {Promise<Order>}
   */
  purchase(cartName) {
    const shoppingCart = this.getCart(cartName)

    if (!shoppingCart) {
      throw new Error(`Shopping cart ${cartName} does not exist`)
    }

    const order = new Order(shoppingCart.getItems())

    return order.save()
      .then(() => Backendless.Cache.delete(cartName))
      .then(() => order)
  }

  /**
   * @private
   * @param {String} cartName
   * @returns {ShoppingCart}
   */
  static getCart(cartName) {
    return Backendless.Cache.get(cartName, ShoppingCart.class)
  }
}

Backendless.ServerCode.addType(Order)
Backendless.ServerCode.addService(ShoppingCartService)