'use strict'

require('mocha')

const should = require('should')
const PersistenceItem = require('../lib/server-code/api/persistence-item')

describe('PersistenceItem', function() {
  it('should compute valid class name', function() {
    class Foo extends PersistenceItem {
    }

    should.equal(new Foo().___class, 'Foo')
  })
})