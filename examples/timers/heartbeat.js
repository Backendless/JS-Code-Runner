'use strict'

Backendless.ServerCode.addTimer({

  name: 'test10',

  frequency: {
    schedule: 'custom',
    repeat  : { every: 600 }
  },

  execute: function() {
    console.log("I'm alive!")

    Backendless.Logging.getLogger('heartbeat').debug("I'm alive!")
  }

})