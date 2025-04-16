'use strict'

const ServerCodeModel = require('./model')
const logger = require('../util/logger')
const path = require('path')
const fs = require('fs')
const file = require('../util/file')
const cliUtils = require('../cli/utils')
const bytesUtils = require('../util/bytes')
const JSZip = require('jszip')
const ApiServerService = require('./services/api-server')

const PACKAGE_FILE = 'package.json'
const BASE_PATTERNS = ['**', '!node_modules/**', '!deploy.zip']

const EXCLUDE_MODULES = [
  'backendless-coderunner'
]

const publish = async opts => {
  const apiServer = new ApiServerService(opts.app, opts.backendless.apiUrl)

  function buildModel() {
    const model = ServerCodeModel.build(process.cwd(), opts.app.exclude)

    if (model.isEmpty() && !opts.allowEmpty) {
      throw new Error('Nothing to publish')
    }

    if (model.errors.length) {
      throw new Error('Please resolve Model Errors before deploying to production')
    }

    return model
  }

  function zip(model) {
    const exclude = (opts.app.exclude || []).map(pattern => '!' + pattern)
    const patterns = BASE_PATTERNS.concat(dependencyPatterns()).concat(exclude)

    return generateZip(model, patterns, opts.keepZip)
  }

  async function confirmZipSize(modelZip) {
    logger.info(`Generated Zip File size is: ${bytesUtils.formatBytes(modelZip.length)}`)

    if (opts.zipSizeConfirmation) {
      const confirmMsg = 'Would you like to deploy it? (Y/N)'
      const confirmed = await cliUtils.confirmation(confirmMsg)

      if (!confirmed) {
        process.exit(0)
      }
    }
  }

  function publishModel(model, modelZip) {
    return apiServer.publish(model, modelZip, opts.deploy.progressInterval)
  }

  const model = await buildModel()
  const modelZip = await zip(model)

  await confirmZipSize(modelZip)

  return publishModel(model, modelZip)
}

async function generateZip(model, patterns, keep) {
  logger.info('Preparing app zip file for deployment..')
  logger.debug('File patterns to be included:')

  patterns.forEach(pattern => logger.debug(pattern))

  const zip = new JSZip()
  const expanded = file.expand(patterns)
  let files = 0

  zip.file('model.json', JSON.stringify(model))

  expanded.forEach(item => {
    if (fs.statSync(item).isDirectory()) {
      zip.folder(item)
    } else {
      zip.file(item, fs.readFileSync(item))
      files++
    }
  })

  logger.info(`${files} files added into deployment archive`)

  const result = await zip.generateAsync({ type: 'nodebuffer' })

  if (keep) {
    fs.writeFileSync('deploy.zip', result)
    logger.info(`Deployment archive is saved to ${path.resolve('deploy.zip')}`)
  }

  return result
}

function dependencyPatterns() {
  const pkgFile = path.resolve(PACKAGE_FILE)

  const result = []

  if (fs.existsSync(pkgFile)) {
    addDependencies(result, require(pkgFile))
  } else {
    logger.info(
      "Warning. Working directory doesn't contain package.json file. " +
      'CodeRunner is not able to auto include dependencies into deployment'
    )
  }

  return result
}

function addDependencies(out, pkg) {
  pkg && pkg.dependencies && Object.keys(pkg.dependencies).reduce(addDependency, out)
}

function addDependency(out, name) {
  const pattern = `node_modules/${name}/**`

  if (!EXCLUDE_MODULES.includes(name) && !out.includes(pattern)) {
    out.push(pattern)

    try {
      addDependencies(out, require(path.resolve('node_modules', name, PACKAGE_FILE)))
    } catch (err) {
      // dependency not found at the root level. for npm2 it's ok
    }
  }

  return out
}

module.exports = opts => ({
  start() {
    return publish(opts)
  }
})
