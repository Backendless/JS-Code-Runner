exports.BufferEncodingStandards = {
  UTF8 : 'utf8',
  BYTES: 'bytes',
}

const UTF8 = exports.BufferEncodingStandards.UTF8
const BYTES = exports.BufferEncodingStandards.BYTES

const bytesBufferToListOfBytes = buffer => {
  const lisOfBytes = []

  for (let i = 0; i < buffer.length; i++) {
    lisOfBytes.push(buffer[i])
  }

  return lisOfBytes
}

exports.convertDataFromTo = function(data, from, to) {
  if (from === to) {
    return data
  }

  if (typeof Buffer === 'undefined') {
    throw new Error('Data converter is not allowed in the env, it require Buffer')
  }

  const buffer = from === BYTES ? Buffer.from(data) : Buffer.from(data, from)

  if (to === UTF8) {
    return buffer.toString(to)
  }

  if (to === BYTES) {
    return bytesBufferToListOfBytes(buffer)
  }
}
