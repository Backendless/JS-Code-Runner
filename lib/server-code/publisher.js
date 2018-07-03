'use strict'

const ServerCodeModel  = require('./model'),
      logger           = require('../util/logger'),
      path             = require('path'),
      fs               = require('fs'),
      file             = require('../util/file'),
      cliUtils         = require('../cli/utils'),
      bytesUtils       = require('../util/bytes'),
      JSZip            = require('jszip'),
      ApiServerService = require('./services/api-server')

const PACKAGE_FILE = 'package.json'
const BASE_PATTERNS = ['**', '!node_modules/**', '!deploy.zip']

const getZipSizeConfirmation = size => (
  `Generated Zip File size is: ${bytesUtils.formatBytes(size)}\n` +
  'Would you like to deploy it? (Y/N)'
)

const publish = async opts => {
  const apiServer = new ApiServerService(opts.app, opts.backendless.apiServer)

  let model

  function buildModel() {
    model = ServerCodeModel.build(process.cwd(), opts.app.exclude)

    if (model.isEmpty() && !opts.allowEmpty) {
      throw new Error('Nothing to publish')
    }

    if (model.errors.length) {
      throw new Error('Please resolve Model Errors before deploying to production')
    }
  }

  function zip() {
    const exclude = (opts.app.exclude || []).map(pattern => '!' + pattern)
    const patterns = BASE_PATTERNS.concat(dependencyPatterns()).concat(exclude)

    return generateZip(model, patterns, opts.keepZip)
  }

  async function confirmZipSize(modelZip) {
    if (opts.zipSizeConfirmation) {
      const confirmMsg = getZipSizeConfirmation(modelZip.length)
      const confirmed = await cliUtils.confirmation(confirmMsg)

      if (!confirmed) {
        process.exit(0)
      }
    }
  }

  function publishModel(modelZip) {
    return apiServer.publish(model, modelZip)
  }

  await buildModel()

  const modelZip = await zip()

  await confirmZipSize(modelZip)

  return publishModel(modelZip)
}

function generateZip(model, patterns, keep) {
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

  const result = zip.generate({ type: 'nodebuffer' })

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

  if (out.indexOf(pattern) === -1) {
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