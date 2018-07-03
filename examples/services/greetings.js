'use strict'

const DICT = {}
DICT['English'] = 'Welcome'
DICT['German'] = 'Willkommen'
DICT['Spanish'] = 'Bienvenido'

class GreetingsService {
  /**
   * @param {String} userName
   * @returns {String}
   */
  getGreeting(userName) {
    return `${DICT[this.config.lang]} ${userName} !`
  }
}

GreetingsService.version = '1.4.3'

Backendless.ServerCode.addService(GreetingsService, [
  {
    name        : 'lang',
    type        : 'choice',
    displayName : 'Language',
    required    : true,
    defaultValue: 'English',
    options     : ['English', 'German', 'Spanish'],
    hint        : 'Please select a Greetings Language'
  }
])
