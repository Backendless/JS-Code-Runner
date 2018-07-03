'use strict'

//you should add 'easysoap' module to your project dependencies as [npm i easysoap --save]
const easysoap = require('easysoap')
const soapClient = easysoap.createClient({
  host: 'http://ws.cdyne.com/',
  path: 'ip2geo/ip2geo.asmx',
  wsdl: 'ip2geo/ip2geo.asmx?WSDL'
})

/**
 * @typedef {Object} ResolveIPRequest
 * @property {String} ipAddress
 * @property {String} licenseKey
 */

/**
 * @typedef {Object} ResolveIPResponse
 * @property {IPInformation} ResolveIPResult
 */

/**
 * @typedef {Object} IPInformation
 * @property {String} City
 * @property {String} StateProvince
 * @property {String} Country
 * @property {String} Organization
 * @property {Number} Latitude
 * @property {Number} Longitude
 * @property {String} AreaCode
 * @property {String} TimeZone
 * @property {Boolean} HasDaylightSavings
 * @property {Number} Certainty
 * @property {String} RegionName
 * @property {String} CountryCode
 */

/**
 * http://ws.cdyne.com/ip2geo/ip2geo.asmx?op=ResolveIP
 */
class Ip2Geo {
  /**
   * @param {ResolveIPRequest} request
   * @returns {ResolveIPResponse}
   */
  resolveIp(request) {
    return soapClient.call({
      method: 'ResolveIP',
      attributes: {
        xmlns: 'http://ws.cdyne.com/'
      },
      params: request
    }).then(callResponse => callResponse.data)
  }
}

Backendless.ServerCode.addService(Ip2Geo)