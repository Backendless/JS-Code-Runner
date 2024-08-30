'use strict'

const ORDER = {
  name       : 'Order',
  description: undefined,
  methods    : {},
  properties : {
    items     : { type: { name: 'Array', elementType: { name: 'ShoppingItem' } } },
    orderPrice: { type: { name: 'Number' } }
  },
  serviceInfo: {}
}

const SHOPPING_CART = {
  name       : 'ShoppingCart',
  description: undefined,
  properties : {},
  methods    : {
    addItem : {
      access     : 'public',
      params     : [],
      tags       : {},
      returnType : undefined,
      description: undefined
    },
    getItems: {
      access     : 'public',
      params     : [],
      tags       : {},
      returnType : undefined,
      description: undefined
    }
  },
  serviceInfo: {}
}

const SHOPPING_CART_SERVICE = {
  name       : 'ShoppingCartService',
  description: undefined,
  properties : {},
  methods    : {
    addItem : {
      access     : 'public',
      returnType : { name: 'void' },
      tags       : {
        argsmappings: JSON.stringify({
          cartName: { type: 'SINGLE_LINE_TEXT' },
          item    : { type: 'DROPDOWN', options: { values: ['Value 1', 'Value 2'] } },
        })
      },
      description: undefined,
      params     : [
        { name: 'cartName', type: { name: 'String' }, optional: false, description: 'cart name description' },
        { name: 'item', type: { name: 'ShoppingItem' }, optional: false }
      ]
    },
    addItems: {
      access     : 'public',
      returnType : { name: 'void' },
      tags       : {},
      description: 'addItems description',
      params     : [
        { name: 'cartName', type: { name: 'String' }, description: 'cart name description', optional: false },
        { name: 'items', type: { name: 'Array', elementType: { name: 'ShoppingItem' } }, optional: false }
      ]
    },
    getCart : {
      access     : 'private',
      returnType : { name: 'ShoppingCart' },
      tags       : {},
      description: undefined,
      params     : [
        { name: 'cartName', type: { name: 'String' }, optional: false }
      ]
    },
    purchase: {
      access     : 'public',
      tags       : {},
      description: undefined,
      params     : [
        { name: 'cartName', type: { name: 'String' }, optional: false }
      ],
      returnType : { name: 'Promise', elementType: { name: 'Order' } }
    }
  },
  serviceInfo: {}
}

const SHOPPING_ITEM = {
  name       : 'ShoppingItem',
  description: undefined,
  methods    : {},
  properties : {
    objectId: { type: { name: 'String' } },
    price   : { type: { name: 'Number' } },
    product : { type: { name: 'String' } },
    quantity: { type: { name: 'Number' } }
  },
  serviceInfo: {}
}

const PET = {
  name       : 'Pet',
  description: undefined,
  methods    : {},
  properties : {
    objectId: { type: { name: 'String' } },
    name    : { type: { name: 'String' } },
    birthday: { type: { name: 'Number' } },
    parent  : { type: { name: 'Pet' } }
  },
  serviceInfo: {}
}

const PET_DELETE_RESPONSE = {
  name       : 'PetDeleteResponse',
  description: undefined,
  methods    : {},
  properties : {
    deletionTime: { type: { name: 'Number' } }
  }
}

const PET_STORE = {
  name       : 'PetStore',
  description: 'Simple Pet Store demonstrating explicit http routes for service methods',
  properties : {},
  methods    : {
    getAll: {
      access     : 'public',
      description: 'List all pets',
      returnType : { name: 'Promise', elementType: { name: 'Pet' } },
      params     : [],
      tags       : {
        route: 'GET /'
      }
    },

    create: {
      access     : 'public',
      description: 'Make a new pet',
      returnType : { name: 'Promise', elementType: { name: 'Pet' } },
      params     : [
        { name: 'pet', type: { name: 'Pet' }, optional: false, description: 'The pet JSON you want to post' }
      ],
      tags       : {
        route: 'POST /'
      }
    },

    save: {
      access     : 'public',
      description: 'Save pet',
      returnType : { name: 'Promise', elementType: { name: 'Pet' } },
      params     : [
        { name: 'pet', type: { name: 'Pet' }, optional: false, description: 'The pet JSON you want to save' }
      ],
      tags       : {
        route: 'PUT /'
      }
    },

    getPet: {
      access     : 'public',
      description: 'Sends the pet with pet Id',
      returnType : { name: 'Promise', elementType: { name: 'Pet' } },
      params     : [],
      tags       : {
        route: 'GET /{petId}'
      }
    },

    deletePet: {
      access     : 'public',
      description: 'Delete the pet by pet Id',
      returnType : { name: 'Promise', elementType: { name: 'PetDeleteResponse' } },
      params     : [],
      tags       : {
        route: 'DELETE /{petId}'
      }
    }
  },
  serviceInfo: {}
}

exports.ORDER = ORDER
exports.SHOPPING_CART = SHOPPING_CART
exports.SHOPPING_CART_SERVICE = SHOPPING_CART_SERVICE
exports.SHOPPING_ITEM = SHOPPING_ITEM
exports.PET = PET
exports.PET_STORE = PET_STORE
exports.PET_DELETE_RESPONSE = PET_DELETE_RESPONSE

exports.map = {
  Order              : ORDER,
  ShoppingCart       : SHOPPING_CART,
  ShoppingCartService: SHOPPING_CART_SERVICE,
  ShoppingItem       : SHOPPING_ITEM,
  Pet                : PET,
  PetStore           : PET_STORE,
  PetDeleteResponse  : PET_DELETE_RESPONSE
}
