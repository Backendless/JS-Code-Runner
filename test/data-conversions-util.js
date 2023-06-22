'use strict'

const dataConversions = require('../lib/util/data-conversions')
const { forTest } = require('./helpers/sdk-sandbox')

const UTF8 = dataConversions.BufferEncodingStandards.UTF8
const BYTES = dataConversions.BufferEncodingStandards.BYTES

describe('Data Conversion Util', function() {
  forTest(this)

  describe('convertDataFromTo', function() {
    it('should convert data from bytes to utf8', function() {
      expect(dataConversions.convertDataFromTo([97, 115, 100], BYTES, UTF8)).to.be.equal('asd')
      expect(dataConversions.convertDataFromTo(Buffer.from('asd'), BYTES, UTF8)).to.be.equal('asd')
    })

    it('should convert data from utf8 to bytes', function() {
      expect(dataConversions.convertDataFromTo('asd', UTF8, BYTES)).to.eql([97, 115, 100])
    })

    it('should return data if equal encoding params', function() {
      const buffer = Buffer.from('asd')

      expect(dataConversions.convertDataFromTo('asd', UTF8, UTF8)).to.eql('asd')
      expect(dataConversions.convertDataFromTo([97, 115, 100], BYTES, BYTES)).to.eql([97, 115, 100])
      expect(dataConversions.convertDataFromTo(buffer, BYTES, BYTES)).to.eql(buffer)
    })
  })
})
