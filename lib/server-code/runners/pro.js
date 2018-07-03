'use strict'

const cloud = require('./cloud')

module.exports = opts => cloud(Object.assign(opts, { sandbox: false }))