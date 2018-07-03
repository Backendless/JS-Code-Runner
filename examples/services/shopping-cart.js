'use strict'

const Order        = require('../models/order'),
      ShoppingCart = require('../models/shopping-cart')

/**
 * Custom Business logic may include API Services
 * When you write a es6 class and pass it to Backendless.ServerCode.addService, you create and API Service
 * Each method of such class turns up into a specific REST endpoint
 *
 * The generated REST will look like this :
 *
 * :HTTP_METHOD http://api.backendless.com/:appVer/services/:serviceName/:serviceVersion/:serviceMethod
 *
 * :serviceName equals to class name
 * :serviceVersion equals to class.version value (See below in this file)
 * :serviceMethod is a class method name or its part. Here are the mapping rules
 *
 *    methodName         |  generated REST
 *    ----------------------------------------------------------------------------------
 *    get{something}     |  GET     /:appVer/services/:serviceName/:serviceVersion/:something
 *    add{something}     |  POST    /:appVer/services/:serviceName/:serviceVersion/:something
 *    set{something}     |  PUT     /:appVer/services/:serviceName/:serviceVersion/:something
 *    delete{something}  |  DELETE  /:appVer/services/:serviceName/:serviceVersion/:something
 *    {something}        |  POST    /:appVer/services/:serviceName/:serviceVersion/:something
 *
 *
 * If you don't want a REST mapping for some class methods just mark them as private
 * with @private jsdoc annotation
 *
 * Specifying correct jsdoc annotations for each service class method is important to let Backendless
 * know more about what kind of arguments or body, the service method expect and what it returns in response
 *
 * [More about API Services]{@link https://backendless.com/documentation/business-logic/js/apieng_overview.htm}
 */

/**
 * This is an example of the Backendless Custom API Service
 *
 * The ShoppingCart service is a sample of the Backendless Custom API Service, which will help you with
 * getting started with the product.
 *
 * The service manages a "shopping cart" which stores products (shopping items) in a transient memory (cache).
 * At the end of the shopping process all the items in the cart can be "purchased" which will result
 * in an "Order" object stored in the persistent storage
 *
 * Usage scenario:
 *  1. Invoke addItem to add one shopping item.
 *  2. Invoke addItems to add two or more shopping items.
 *  3. Invoke getItems to see the contents of the shopping cart.
 *  4. Invoke deleteItem to remove an item from the shopping cart.
 *  5. Invoke getItems to make sure the item from the previous step has been deleted.
 *  6. Invoke purchase to purchase all the items in the cart.
 *  7. Open the Data screen of the console and check the Orders table - the order should be in there.
 *
 *  The Backendless Server will generate the following REST routes for this ShoppingCartService class:
 *
 *  POST    /v1/services/ShoppingCartService/1.0.1/item
 *  POST    /v1/services/ShoppingCartService/1.0.1/items
 *  DELETE  /v1/services/ShoppingCartService/1.0.1/item
 *  GET     /v1/services/ShoppingCartService/1.0.1/items
 *  PUT     /v1/services/ShoppingCartService/1.0.1/quantity
 *  POST    /v1/services/ShoppingCartService/1.0.1/purchase
 */
class ShoppingCartService {

  /**
   * @param {String} cartName
   * @param {ShoppingItem} item
   * @returns {Promise.<void>}
   */
  addItem(cartName, item) {
    return this.addItems(cartName, [item])
  }

  /**
   * @param {String} cartName
   * @param {Array.<ShoppingItem>} items
   * @returns {Promise.<void>}
   */
  addItems(cartName, items) {
    return ShoppingCart.get(cartName).then(cart => {
      if (!cart) {
        cart = new ShoppingCart({ name: cartName })
      }

      items.forEach(item => cart.addItem(item))

      return cart.save()
    })
  }

  /**
   * @param {String} cartName
   * @param {String} product
   * @returns {Promise.<void>}
   */
  deleteItem(cartName, product) {
    return ShoppingCart.get(cartName, true).then(cart => cart.deleteItem(product).save())
  }

  /**
   * @param {String} cartName
   * @returns {Promise.<Array.<ShoppingItem>>}
   */
  getItems(cartName) {
    return ShoppingCart.get(cartName, true).then(cart => cart.getItems())
  }

  /**
   * @param {String} cartName
   * @param {String} productName
   * @param {Number} quantity
   * @returns {Promise.<void>}
   */
  setQuantity(cartName, productName, quantity) {
    return ShoppingCart.get(cartName, true).then(cart => cart.setQuantity(productName, quantity).save())
  }

  /**
   * @param {String} cartName
   * @returns {Promise.<Order>}
   */
  purchase(cartName) {
    return ShoppingCart.get(cartName, true).then(cart => {
      const order = new Order(cart.getItems())

      return order.save()
        .then(() => cart.destroy())
        .then(() => order)
    })
  }
}

/**
 * A specific Service version. Optional. Default value is 1.0.0
 *
 * You may have several services with different versions :
 *
 * http://api.backendless.com/v1/services/ShoppingCartService/1.0.1
 * http://api.backendless.com/v1/services/ShoppingCartService/1.4.1
 *
 * @type {string}
 */
ShoppingCartService.version = '1.0.1'

/**
 * lets CodeRunner know that ShoppingCartService class is an API Service
 */
Backendless.ServerCode.addService(ShoppingCartService)