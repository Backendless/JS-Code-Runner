'use strict'

class Order extends Backendless.ServerCode.PersistenceItem {
  constructor(items) {
    super()

    /**
     * @type {Array.<ShoppingItem>}
     */
    this.items = items || []

    /**
     * @type {Number}
     */
    this.orderPrice = this.items.reduce((sum, item) => {
      return (sum || 0) + (item.price * item.quantity)
    }, 0)
  }

  save() {
    return super.save()
      .then(serverOrder => this.objectId = serverOrder.objectId)
      .then(() => Promise.all(this.items.map(item => item.save())))
      .then(items => this.items = items)
      .then(() => this.setRelation('items:ShoppingItem:n', this.items))
  }
}

module.exports = Backendless.ServerCode.addType(Order)