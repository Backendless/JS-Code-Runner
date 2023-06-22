const dataConversions = require('../../../../util/data-conversions')

const UTF8 = dataConversions.BufferEncodingStandards.UTF8
const BYTES = dataConversions.BufferEncodingStandards.BYTES

const convertDataFromTo = dataConversions.convertDataFromTo

function transformResult(result, event) {
  const normalizer = ResultTransformers[event.id]

  return normalizer ? normalizer(result, event) : result
}

const beforeDownload = (result, event) => {
  const { name: eventName } = event

  if (Array.isArray(result)) {
    return result
  }

  if (typeof result === 'string') {
    return convertDataFromTo(result, UTF8, BYTES)
  }

  if (typeof result === 'object' && result.fileURL && typeof result.fileURL === 'string') {
    return result.fileURL
  }

  throw new Error(
    `The "${ eventName }" handler has wrong result type. Valid result types: 
 - Buffer (lists of bytes)
 - String (the file content) 
 - Object { fileURL: [string] }`
  )
}

const ResultTransformers = {
  618: beforeDownload
}

module.exports = transformResult
