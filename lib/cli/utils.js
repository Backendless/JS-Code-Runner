'use strict'

async function confirmation(msg) {
  const answer = (await prompt(msg) || '').toUpperCase()

  if (answer === 'Y' || answer === 'YES') {
    return true
  }

  if (answer === 'N' || answer === 'NO') {
    return false
  }
}

function prompt(message) {
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout })

  return new Promise((resolve) => {
    rl.question(message, (value) => {
      rl.close()
      resolve(value)
    })
  })
}

exports.prompt = prompt
exports.confirmation = confirmation