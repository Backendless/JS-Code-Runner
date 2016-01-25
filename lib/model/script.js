"use strict";

const CodeRunner    = require('../index'),
      file          = require('../util/file'),
      Module        = require('module'),
      vm            = require('vm'),
      path          = require('path'),
      logger        = require('../util/logger'),
      EventsHandler = require('../api').EventsHandler,
      events        = require('./events');

const shebangRe = /^\#\!.*/;

exports.load = function(fileName) {
  var codeRunnerModule = new Module(fileName, this);
  codeRunnerModule.require = function(path) {
    if (path === 'backendless-coderunner') {
      return CodeRunner;
    }

    return Module.prototype.require.apply(this, arguments);
  };

  return new Promise((resolve, reject) => {
    try {
      codeRunnerModule.load(path.resolve(fileName));
      logger.debug(`Reading ${fileName}...OK`);
      resolve(codeRunnerModule.exports);
    } catch (e) {
      logger.error(`Reading ${fileName}...Error`);
      logger.error(e.message || e);
      reject(e);
    }
  });
};

exports.loadSecure = function(fileName) {
  return file.read(fileName)
    .then(content => {
      // remove shebang
      content = content.replace(shebangRe, '');

      const sandbox = {
        console: console,

        require: function(path) {
          if (path === 'backendless-coderunner') {
            return CodeRunner;
          }

          return Module.prototype.require.apply(this, arguments);
        }
      };

      try {
        vm.runInNewContext(content, sandbox, fileName);
      } catch (e) {
        console.log(e);
        return Promise.reject(e.message);
      }
    });
};

exports.analyse = function(fileName) {
  return this.load(fileName)
    .then((module)=> {
      if (module instanceof EventsHandler) {
        logger.debug(`${fileName} -> Business Logic found`);

        try {
          return parseHandler(module);
        } catch (e) {
          logger.error(`Validation Error: ${e.message}`);
          return Promise.reject(e);
        }
      } else {
        logger.debug(`${fileName} -> No Business Logic found`);
      }
    });
};

function parseHandler(handler, fileName) {
  if (!handler.provider) {
    throw new Error('Events Provider is not specified');
  }

  let providerEvents = events.types.byProvider[handler.provider.id];
  if (!providerEvents) {
    throw new Error('Unknown Events Provider: ' + handler.provider.id);
  }

  if (handler.provider === events.providers.TIMER) {
    return [parseTimer(handler, fileName)];
  }

  if (!handler.target && handler.provider.targeted) {
    throw new Error('Target is required for ' + handler.provider.id);
  }

  let handlerEvents = [];
  let timer;

  if (handler.provider == events.providers.TIMER) {
    timer = parseTimer(handler);
  }

  for (let key in Object.keys(handler)) {
    let async = !key.endsWith('Sync');
    let event = async ? key : key.substring(0, key.length - 4);

    if (providerEvents[event]) {
      handlerEvents.push({
        id      : event.id,
        async   : timer ? true : async,
        isTimer : !!timer,
        target  : timer || handler.target,
        provider: fileName
      });
    }
  }

  return handlerEvents;
}

function parseTimer(timer) {
  let timername = timer.name,
      startDate = timer.startDate,
      expire    = timer.expire,
      frequency = timer.frequency || {},
      schedule  = frequency.schedule;

  const now = new Date().getTime();
  const singleTick = schedule === 'once';

  if (startDate) {
    startDate = new Date(startDate).getTime();

    if (startDate < now && singleTick) {
      throw new Error(`${timername} timer is scheduled to run only once its [startDate] is in the past`);
    }
  } else if (singleTick) {
    throw new Error(`${timername} timer is scheduled to run only once but its [startDate] is not specified`);
  }

  if (expire) {
    expire = new Date(expire).getTime();

    if (expire < now) {
      throw new Error(`${timername} timer already expired`);
    }
  }

  return {timername, startDate, expire, frequency};
}