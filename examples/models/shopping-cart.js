'use strict'

const ShoppingItem = require('./shopping-item')

class ShoppingCart {
  constructor(opts) {
    opts = opts || {}

    this.name = opts.name
    this.items = opts.items || []
    this.___class = ShoppingCart.name
  }

  addItem(item) {
    item.objectId = null

    this.items.push(item)
  }

  deleteItem(product) {
    const idx = this.items.findIndex(item => item.product === product)

    if (idx === -1) {
      throw new Error(`No ${product} in cart`)
    }

    this.items.splice(idx, 1)

    return this
  }

  setQuantity(product, quantity) {
    const productItem = this.items.find(item => item.product === product)

    if (!productItem) {
      throw new Error(`No [${product}] in cart`)
    }

    productItem.quantity = quantity

    return this
  }

  getItems() {
    return this.items
  }

  destroy() {
    return Backendless.Cache.remove(this.name)
  }

  save() {
    return Backendless.Cache.put(this.name, this)
  }

  static get(name, mustExist) {
    Backendless.Cache.setObjectFactory(ShoppingCart.name, ShoppingCart)

    return Backendless.Cache.get(name).then(cart => {
      if (cart) {
        cart.items = cart.items.map(item => Object.assign(new ShoppingItem(), item))
      } else if (mustExist) {
        throw new Error(`Shopping cart [${name}] does not exist`)
      }

      return cart
    })
  }
}

module.exports = ShoppingCart