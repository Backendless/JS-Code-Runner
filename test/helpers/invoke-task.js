const executor = require('../../lib/server-code/runners/tasks/executor'),
      json     = require('../../lib/util/json'),
      argsUtil = require('../../lib/server-code/runners/tasks/util/args')

/**
 * @param {Object} task
 * @param {ServerCodeModel=} model
 * @returns {Promise.<Object>}
 */
module.exports = function(task, model) {
  const opts = { backendless: { repoPath: '' }, automation: { internalAddress: 'http://localhost:9095' } }

  return executor.execute(task, opts, model)
    .then(res => res && json.parse(res))
    .then(res => {
      if (res && res.arguments) {
        res.arguments = res.arguments && argsUtil.decode(res.arguments)
      }

      return res
    })
}
