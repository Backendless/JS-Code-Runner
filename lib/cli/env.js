'use strict'

module.exports = function enrichWithENV(options) {
  const API_URL = process.env.APIURL
  const API_HOST = process.env.APIHOST
  const API_PORT = process.env.APIPORT
  const REPO_PATH = process.env.REPO_PATH
  const BL_MANAGEMENT_HTTP_PORT = process.env.BL_MANAGEMENT_HTTP_PORT

  if (API_URL) {
    options.backendless.apiServer = API_URL

  } else if (API_HOST) {
    options.backendless.apiServer = `http://${API_PORT ? `${API_HOST}:${API_PORT}` : API_HOST}`
  }

  if (REPO_PATH) {
    options.backendless.repoPath = REPO_PATH
  }

  if (BL_MANAGEMENT_HTTP_PORT) {
    options.backendless.managementHttpPort = BL_MANAGEMENT_HTTP_PORT
  }
}
