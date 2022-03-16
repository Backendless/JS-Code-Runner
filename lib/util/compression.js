const zlib = require('zlib')

const MIN_DATA_SIZE = 8 * 1024
const COMPRESSION_LEVEL = 7

exports.compress = (outputData, minDataSize, compressionLevel) => {
  minDataSize = minDataSize || MIN_DATA_SIZE
  compressionLevel = compressionLevel || COMPRESSION_LEVEL

  return new Promise((resolve, reject) => {
    const data = Buffer.from(outputData, 'utf8')

    if (data.length < minDataSize) {
      const resultData = Buffer.alloc(data.length + 1)
      data.copy(resultData, 1, 0, data.length)

      resultData[0] = 0x00 // set mark byte - "uncompressed data"

      resolve(resultData)
    } else {
      zlib.deflate(data, { level: compressionLevel }, (err, compressedData) => {
        if (!err) {
          const resultData = Buffer.alloc(compressedData.length + 5)

          compressedData.copy(resultData, 5, 0, compressedData.length)

          resultData[0] = 0x01 // set mark byte - "compressed data"
          resultData[1] = (data.length >>> 24)
          resultData[2] = (data.length >>> 16)
          resultData[3] = (data.length >>> 8)
          resultData[4] = data.length

          return resolve(resultData)

        } else {
          reject(err)
        }
      })
    }
  })
}

exports.decompress = buff => {
  if (buff == null) {
    return null
  }

  return new Promise((resolve, reject) => {
    const firstByte = buff.readUInt8()

    if (firstByte === 0x01) {
      let size = 0

      size |= (buff.readUInt8(1) << 24) & 0xFF000000
      size |= (buff.readUInt8(2) << 16) & 0xFF0000
      size |= (buff.readUInt8(3) << 8) & 0xFF00
      size |= buff.readUInt8(4) & 0xFF

      const resultData = Buffer.alloc(size)

      zlib.inflate(buff.slice(5), { level: COMPRESSION_LEVEL, dictionary: resultData },(err, inflated) => {
        if (!err) {
          resolve(inflated.toString('utf8'))
        } else {
          reject(err)
        }
      })
    } else {
      resolve(buff.slice(1).toString('utf8'))
    }
  })
}
