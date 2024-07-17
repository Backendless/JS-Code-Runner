/* eslint max-len: ["off"] */
'use strict'

const assert   = require('assert'),
      executor = require('../lib/server-code/runners/tasks/executor'),
      invoke   = require('./helpers/invoke-task'),
      should = require('should')

require('backendless').ServerCode = require('../lib/server-code/api')
require('mocha')

const PET_STORE_SERVICE_XML = (`<?xml version="1.0" encoding="UTF-8"?>
<namespaces>
  <namespace name="services" fullname="services">
    <service name="PetStore" description="Simple Pet Store demonstrating explicit http routes for service methods" fullname="services.PetStore" namespace="services">
      <method name="getAll" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" description="List all pets" operationName="getAll" registerAsAutomationAction="false" argsMappings="" method="GET" path="/">
      </method>
      <method name="create" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" description="Make a new pet" operationName="create" registerAsAutomationAction="false" argsMappings="" method="POST" path="/">
        <arg name="pet" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" required="true" description="The pet JSON you want to post"/>
      </method>
      <method name="save" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" description="Save pet" operationName="save" registerAsAutomationAction="false" argsMappings="" method="PUT" path="/">
        <arg name="pet" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" required="true" description="The pet JSON you want to save"/>
      </method>
      <method name="getPet" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" description="Sends the pet with pet Id" operationName="getPet" registerAsAutomationAction="false" argsMappings="" method="GET" path="/{petId}">
      </method>
      <method name="deletePet" type="PetDeleteResponse" nativetype="services.PetDeleteResponse" fulltype="services.PetDeleteResponse" javatype="services.PetDeleteResponse" description="Delete the pet by pet Id" operationName="deletePet" registerAsAutomationAction="false" argsMappings="" method="DELETE" path="/{petId}">
      </method>
    </service>
    <datatype name="Pet" description="Pet" fullname="services.Pet" typeNamespace="services">
      <field name="objectId" type="String" nativetype="String" fulltype="String" javatype="java.lang.String"/>
      <field name="name" type="String" nativetype="String" fulltype="String" javatype="java.lang.String"/>
      <field name="birthday" type="Number" nativetype="float" fulltype="Number" javatype="float"/>
      <field name="parent" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet"/>
    </datatype>
    <datatype name="PetDeleteResponse" description="PetDeleteResponse" fullname="services.PetDeleteResponse" typeNamespace="services">
      <field name="deletionTime" type="Number" nativetype="float" fulltype="Number" javatype="float"/>
    </datatype>
  </namespace>
  <runtime generationMode="FULL">
  </runtime>
</namespaces>`
)

const SHOPPING_CART_SERVICE_XML = (`<?xml version="1.0" encoding="UTF-8"?>
<namespaces>
  <namespace name="services" fullname="services">
    <service name="ShoppingCartService" description="ShoppingCartService" fullname="services.ShoppingCartService" namespace="services">
      <method name="addItem" type="void" nativetype="void" fulltype="void" javatype="void" description="" operationName="addItem" registerAsAutomationAction="false" argsMappings="{&quot;cartName&quot;:{&quot;type&quot;:&quot;SINGLE_LINE_TEXT&quot;},&quot;item&quot;:{&quot;type&quot;:&quot;DROPDOWN&quot;,&quot;options&quot;:{&quot;values&quot;:[&quot;Value 1&quot;,&quot;Value 2&quot;]}}}">
        <arg name="cartName" type="String" nativetype="String" fulltype="String" javatype="java.lang.String" required="true" description="cart name description"/>
        <arg name="item" type="ShoppingItem" nativetype="services.ShoppingItem" fulltype="services.ShoppingItem" javatype="services.ShoppingItem" required="true"/>
      </method>
      <method name="addItems" type="void" nativetype="void" fulltype="void" javatype="void" description="addItems description" operationName="addItems" registerAsAutomationAction="false" argsMappings="">
        <arg name="cartName" type="String" nativetype="String" fulltype="String" javatype="java.lang.String" required="true" description="cart name description"/>
        <arg name="items" type="Array" nativetype="List&lt;services.ShoppingItem&gt;" fulltype="Array" javatype="java.util.List&lt;services.ShoppingItem&gt;" elementType="ShoppingItem" required="true"/>
      </method>
      <method name="purchase" type="Order" nativetype="services.Order" fulltype="services.Order" javatype="services.Order" description="" operationName="purchase" registerAsAutomationAction="false" argsMappings="">
        <arg name="cartName" type="String" nativetype="String" fulltype="String" javatype="java.lang.String" required="true"/>
      </method>
    </service>
    <datatype name="ShoppingItem" description="ShoppingItem" fullname="services.ShoppingItem" typeNamespace="services">
      <field name="objectId" type="String" nativetype="String" fulltype="String" javatype="java.lang.String"/>
      <field name="product" type="String" nativetype="String" fulltype="String" javatype="java.lang.String"/>
      <field name="price" type="Number" nativetype="float" fulltype="Number" javatype="float"/>
      <field name="quantity" type="Number" nativetype="float" fulltype="Number" javatype="float"/>
    </datatype>
    <datatype name="Order" description="Order" fullname="services.Order" typeNamespace="services">
      <field name="items" type="Array" nativetype="List&lt;services.ShoppingItem&gt;" fulltype="Array" javatype="java.util.List&lt;services.ShoppingItem&gt;" elementType="ShoppingItem"/>
      <field name="orderPrice" type="Number" nativetype="float" fulltype="Number" javatype="float"/>
    </datatype>
  </namespace>
  <runtime generationMode="FULL">
  </runtime>
</namespaces>`
)

/**
 * @param {String} actionType
 * @param {String=} path
 * @returns {CodeRunnerTask}
 */
function createTask(actionType, path = '') {
  return {
    ___jsonclass : executor.RAI,
    initAppData  : {},
    actionType   : actionType,
    applicationId: '',
    relativePath : path
  }
}

const createAnalyseCodeTask = path => createTask('ANALYSE_SERVER_CODE', `test/${path}`)

describe('[invoke-action] task executor', function() {
  describe('on SHUTDOWN action', function() {
    it('should stop the CodeRunner process', function() {
      const exit = process.exit
      let exitCalled = false

      process.exit = function() {
        exitCalled = true
      }

      process.exit.restore = function() {
        process.exit = exit
      }

      return executor.execute(createTask('SHUTDOWN'), { backendless: { repoPath: '' } })
        .then(process.exit.restore, process.exit.restore)
        .then(() => should.equal(exitCalled, true))
    })
  })

  describe('on ANALYSE_CODE action', function() {
    it('should parse found services', function() {
      return invoke(createAnalyseCodeTask('fixtures/query-params'))
        .then(res => {
          assert.equal(res.exception, null)

          const services = res.arguments.services
          assert.equal(services.length, 1)

          assert.equal(services.length, 1)
          assert.equal(services[0].name, 'ShoppingCartService')
          assert.equal(services[0].description, 'ShoppingCartService')
          assert.equal(services[0].version, '1.0.0')
          assert.equal(services[0].xml, SHOPPING_CART_SERVICE_XML)
        })
    })

    it('should handle no services', function() {
      return invoke(createAnalyseCodeTask('dummy-folder'))
        .then(res => {
          assert.equal(res.exception, null)
          assert.deepEqual(res.arguments.services, [])
        })
    })

    it('should handle service methods with explicit route', function() {
      return invoke(createAnalyseCodeTask('fixtures/path-params'))
        .then(res => {
          assert.equal(res.exception, null)

          const services = res.arguments.services

          assert.equal(services.length, 1)
          assert.equal(services[0].name, 'PetStore')
          assert.equal(services[0].description, 'Simple Pet Store demonstrating explicit http routes for service methods')
          assert.equal(services[0].version, '1.0.0')
          assert.equal(services[0].config.length, 0)
          assert.equal(services[0].xml, PET_STORE_SERVICE_XML)
        })
    })
  })

})
