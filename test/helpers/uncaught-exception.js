'use strict'

// intercepts the next 'uncaughtException' instead of mocha, the worker handles it the same way
function catchUncaughtException() {
  const mochaListeners = process.listeners('uncaughtException')

  process.removeAllListeners('uncaughtException')

  return new Promise(resolve => {
    process.once('uncaughtException', error => {
      mochaListeners.forEach(listener => process.on('uncaughtException', listener))

      resolve(error)
    })
  })
}

module.exports = catchUncaughtException
