const ONE_KB = 1024
const MEASURES = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

exports.formatBytes = function(bytes, decimals) {
  if (bytes !== 0) {
    decimals = decimals === undefined ? 2 : decimals

    const measureIndex = Math.floor(Math.log(bytes) / Math.log(ONE_KB))
    const value = parseFloat((bytes / Math.pow(ONE_KB, measureIndex)).toFixed(decimals))

    return `${value} ${MEASURES[measureIndex]}`
  }

  return `0 ${MEASURES[0]}`
}