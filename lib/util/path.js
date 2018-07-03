'use strict'

exports.toUnix = function toUnix(path) {
  return path.replace(/\\/g, '/')
}