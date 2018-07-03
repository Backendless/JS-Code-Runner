'use strict'

const glob = require('glob'),
      fs   = require('fs'),
      path = require('path')

/**
 * Process specified wildcard glob patterns or file names against a
 * callback, excluding and uniquing files in the result set.
 *
 * @param {Array.<string>} patterns
 * @param {function} predicate pattern matcher
 *
 * @returns {Array.<string>} found files
 */
exports.processPatterns = function(patterns, predicate) {
  const result = []

  patterns.forEach(function(pattern) {
    const exclusion = pattern.indexOf('!') === 0

    if (exclusion) {
      pattern = pattern.slice(1)
    }

    const matches = predicate(pattern)

    matches.forEach((file) => {
      const pos = result.indexOf(file)

      if (pos !== -1 && exclusion) {
        result.splice(pos, 1)
      } else if (pos === -1 && !exclusion) {
        result.push(file)
      }
    })

  })

  return result
}

const NODE_MODULES = 'node_modules'
const inNodeModules = file => file.includes(NODE_MODULES)
const isDir = file => fs.statSync(file).isDirectory()
const hasJSExtension = file => file.endsWith('.js')

const toMatcher = pattern => {
  const minimatch = glob.glob(pattern, { noprocess: true }).minimatch

  return filePath => minimatch.match(filePath)
}

exports.serverCodeFilesInPath = function(basePath, exclude = []) {
  const result = []
  const exclusionMatchers = exclude.map(toMatcher)

  const isExcluded = filePath => {
    const relativePath = path.relative(basePath, filePath)

    return relativePath && exclusionMatchers.find(matcher => matcher(relativePath))
  }

  const processItem = item => {
    if (inNodeModules(item) || isExcluded(item)) return

    if (isDir(item)) {
      fs.readdirSync(item).forEach(child => processItem(`${item}/${child}`))
    } else if (hasJSExtension(item)) {
      result.push(item)
    }
  }

  if (fs.existsSync(basePath)) {
    processItem(basePath)
  }

  return result
}

/**
 * Returns an array of all file paths that match the given wildcard patterns.
 *
 * @param {Array.<string>} patterns
 * @param {Object=} opts
 * @returns {Array.<string>}
 */
exports.expand = function(patterns, opts) {
  return exports.processPatterns(patterns, function(pattern) {
    return glob.sync(pattern, opts)
  })
}

/**
 * Promise based file read
 * @param {String} file
 * @param {String} encoding
 * @returns {Promise.<String>}
 */
exports.read = function(file, encoding) {
  encoding = encoding || 'utf8'

  return new Promise((resolve, reject) => {
    fs.readFile(file, encoding, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}