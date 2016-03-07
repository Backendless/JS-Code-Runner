/* global Backendless */

'use strict';

class Person extends Backendless.ServerCode.PersistenceItem {

  constructor() {
    super();

    /**
     @name Person#name
     @type String
     */
    this.name = undefined;
  }
}

module.exports = Person;