'use strict'

const json         = require('../lib/util/json'),
      should       = require('should'),
      path         = require('path'),
      readFileSync = require('fs').readFileSync

require('mocha')

const space = '  '

const readAndFormatJSON = filePath =>
  JSON.stringify(JSON.parse(readFileSync(filePath, 'utf-8')), null, space)

describe('JSON Util', function() {
  describe('parse', function() {
    it('should resolve object references', function() {
      const parsed = json.parse('[{"role":[""]},{"name":"John","roles":[""]},{"result":{"___objectref":3}}]')

      should.equal(parsed[1], parsed[2].result)
      should.equal(parsed[1].name, 'John')
    })

    it('should resolve circular object references', function() {
      const a = json.parse('{"b":{"a":{"___objectref": 0}},"c":{"___objectref": 1}}')

      should.equal(a, a.b.a)
      should.equal(a.b, a.c)
    })

    it('should resolve encoded dates', function() {
      const parsed = json.parse(JSON.stringify({
        firstName  : 'Foo',
        created    : '1479813417000',
        updated    : '1479813417001',
        lastName   : 'Bar',
        nested     : {
          created    : '1479813417003',
          ___dates___: ['1479813417003'],
          test       : {},
          result     : { ___objectref: 1 }
        },
        nested2    : {
          created    : '1479813417002',
          ___dates___: ['1479813417002'],
          result     : { ___objectref: 3 }
        },
        ___dates___: ['1479813417000', '1479813417001']
      }))

      should.ok(parsed.created instanceof Date)
      should.ok(parsed.nested.created instanceof Date)
      should.not.exist(parsed.___dates___)
      should.not.exist(parsed.nested.___dates___)

      should.equal(parsed.created.getTime(), 1479813417000)
      should.equal(parsed.updated.getTime(), 1479813417001)
      should.equal(parsed.nested.result, parsed.nested)
      should.equal(parsed.nested.created.getTime(), 1479813417003)
      should.equal(parsed.nested2.result, parsed.nested2)
      should.equal(parsed.nested2.created.getTime(), 1479813417002)
    })

    it('should perform class mappings', function() {
      class Person {
      }

      json.parse('{"___class":"Person"}', { 'Person': Person }).should.be.instanceof(Person)
    })
  })

  describe('stringify', function() {
    it('should resolve object references', function() {
      const a = {}
      const b = { a }

      const s = json.stringify({ a, b, c: [{ a }, { b }] })
      s.should.equal('{"a":{},"b":{"a":{"___objectref":1}},"c":[{"a":{"___objectref":1}},{"b":{"___objectref":2}}]}')
    })

    it('should resolve circular object references', function() {
      const a = {}
      a.b = a //circular

      json.stringify(a).should.equal('{"b":{"___objectref":0}}')
    })
  })

  it('should resolve object references after full transform circle', function() {
    const a = {}
    const b = { a }
    const z = { a, '10': {}, '01': a, 1: { 2: b, a: {} }, d: {}, b, c: [{ a }, { b }] }

    const parsed = json.parse(json.stringify(z))

    should.equal(parsed.a, parsed.b.a)
    should.equal(parsed.a, parsed.c[0].a)
    should.equal(parsed.b, parsed.c[1].b)
  })

  it('should restore the complex structure into its original state', function() {

    const complexJson = readAndFormatJSON(path.resolve(__dirname, './fixtures/complex.json'))

    const parsed = json.parse(complexJson)
    const stringified = json.stringify(parsed, space)

    should.equal(stringified, complexJson)
  })
})