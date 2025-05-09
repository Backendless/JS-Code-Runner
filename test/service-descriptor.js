/*eslint max-len: ["off"]*/

'use strict'

const assert          = require('assert'),
      definitions     = require('./helpers/definitions').map,
      buildServiceXml = require('../lib/server-code/model/service-descriptor').buildXML

require('mocha')

const SHOPPING_CART_SERVICE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<namespaces>
  <namespace name="services" fullname="services">
    <service name="ShoppingCartService" description="ShoppingCartService" fullname="services.ShoppingCartService" namespace="services">
      <method name="addItem" type="void" nativetype="void" fulltype="void" javatype="void" description="" operationName="addItem" registerAs="" appearanceIcon="" appearanceColor="" metaInfo="{&quot;args&quot;:{},&quot;sampleResult&quot;:null,&quot;sampleResultLoader&quot;:null}">
        <arg name="cartName" type="String" nativetype="String" fulltype="String" javatype="java.lang.String" required="true" description="cart name description"/>
        <arg name="item" type="ShoppingItem" nativetype="services.ShoppingItem" fulltype="services.ShoppingItem" javatype="services.ShoppingItem" required="true"/>
      </method>
      <method name="addItems" type="void" nativetype="void" fulltype="void" javatype="void" description="addItems description" operationName="addItems" registerAs="" appearanceIcon="" appearanceColor="" metaInfo="{&quot;args&quot;:{},&quot;sampleResult&quot;:null,&quot;sampleResultLoader&quot;:null}">
        <arg name="cartName" type="String" nativetype="String" fulltype="String" javatype="java.lang.String" required="true" description="cart name description"/>
        <arg name="items" type="Array" nativetype="List&lt;services.ShoppingItem&gt;" fulltype="Array" javatype="java.util.List&lt;services.ShoppingItem&gt;" elementType="ShoppingItem" required="true"/>
      </method>
      <method name="purchase" type="Order" nativetype="services.Order" fulltype="services.Order" javatype="services.Order" description="" operationName="purchase" registerAs="" appearanceIcon="" appearanceColor="" metaInfo="{&quot;args&quot;:{},&quot;sampleResult&quot;:null,&quot;sampleResultLoader&quot;:null}">
        <arg name="cartName" type="String" nativetype="String" fulltype="String" javatype="java.lang.String" required="true"/>
      </method>
    </service>
    <datatype name="ShoppingItem" description="ShoppingItem" fullname="services.ShoppingItem" typeNamespace="services">
      <field name="objectId" type="String" nativetype="String" fulltype="String" javatype="java.lang.String"/>
      <field name="price" type="Number" nativetype="float" fulltype="Number" javatype="float"/>
      <field name="product" type="String" nativetype="String" fulltype="String" javatype="java.lang.String"/>
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

const PET_STORE_SERVICE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<namespaces>
  <namespace name="services" fullname="services">
    <service name="PetStore" description="Simple Pet Store demonstrating explicit http routes for service methods" fullname="services.PetStore" namespace="services">
      <method name="getAll" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" description="List all pets" operationName="getAll" registerAs="" appearanceIcon="" appearanceColor="" metaInfo="{&quot;args&quot;:{},&quot;sampleResult&quot;:null,&quot;sampleResultLoader&quot;:null}" method="GET" path="/">
      </method>
      <method name="create" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" description="Make a new pet" operationName="create" registerAs="" appearanceIcon="" appearanceColor="" metaInfo="{&quot;args&quot;:{},&quot;sampleResult&quot;:null,&quot;sampleResultLoader&quot;:null}" method="POST" path="/">
        <arg name="pet" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" required="true" description="The pet JSON you want to post"/>
      </method>
      <method name="save" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" description="Save pet" operationName="save" registerAs="" appearanceIcon="" appearanceColor="" metaInfo="{&quot;args&quot;:{},&quot;sampleResult&quot;:null,&quot;sampleResultLoader&quot;:null}" method="PUT" path="/">
        <arg name="pet" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" required="true" description="The pet JSON you want to save"/>
      </method>
      <method name="getPet" type="Pet" nativetype="services.Pet" fulltype="services.Pet" javatype="services.Pet" description="Sends the pet with pet Id" operationName="getPet" registerAs="" appearanceIcon="" appearanceColor="" metaInfo="{&quot;args&quot;:{},&quot;sampleResult&quot;:null,&quot;sampleResultLoader&quot;:null}" method="GET" path="/{petId}">
      </method>
      <method name="deletePet" type="PetDeleteResponse" nativetype="services.PetDeleteResponse" fulltype="services.PetDeleteResponse" javatype="services.PetDeleteResponse" description="Delete the pet by pet Id" operationName="deletePet" registerAs="" appearanceIcon="" appearanceColor="" metaInfo="{&quot;args&quot;:{},&quot;sampleResult&quot;:null,&quot;sampleResultLoader&quot;:null}" method="DELETE" path="/{petId}">
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

describe('service descriptor', function() {
  it('should build valid service XML', function() {
    const serviceXml = buildServiceXml(['ShoppingCartService'], definitions)

    assert.equal(serviceXml, SHOPPING_CART_SERVICE_XML)
  })

  it('should support explicit http methods and routes', function() {
    const serviceXml = buildServiceXml(['PetStore'], definitions)

    assert.equal(serviceXml, PET_STORE_SERVICE_XML)
  })
})
