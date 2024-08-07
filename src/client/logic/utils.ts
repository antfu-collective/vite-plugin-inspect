export function msToTime(ms: number) {
  if (ms <= 0.5)
    return '<1ms'
  if (ms < 2000)
    return `${ms}ms`
  const seconds = +(ms / 1000).toFixed(1)
  if (seconds < 60)
    return `${seconds}s`
  const minutes = +(ms / (1000 * 60)).toFixed(1)
  if (minutes < 60)
    return `${minutes}m`
  const hours = +(ms / (1000 * 60 * 60)).toFixed(1)
  if (hours < 24)
    return `${hours}h`
  const days = +(ms / (1000 * 60 * 60 * 24)).toFixed(1)
  return `${days}d`
}

export function guessMode(code: string) {
  if (code.trimStart().startsWith('<'))
    return 'htmlmixed'
  if (code.match(/^import\s/))
    return 'javascript'
  if (code.match(/^[.#].+\{/))
    return 'css'
  return 'javascript'
}

export function inspectSourcemaps({ code, sourcemaps }: { code: string, sourcemaps?: string }) {
  // easier debugging of sourcemaps
  // eslint-disable-next-line no-console
  console.info('sourcemaps', JSON.stringify(sourcemaps, null, 2))

  const serialized = serializeForSourcemapsVisualizer(code, sourcemaps!)
  // open link in new tab
  window.open(`https://evanw.github.io/source-map-visualization#${serialized}`, '_blank')
}

export function safeJsonParse(str: string) {
  try {
    return JSON.parse(str)
  }
  catch (e) {
    console.error('Failed to parse JSON', str)
    return null
  }
}

// serialize to base64 and delimited by null characters and code length
// parser code: https://github.com/evanw/source-map-visualization/blob/5c08ef62f3eff597796f1b5c73ae822d9f467d00/code.js#L1794
function serializeForSourcemapsVisualizer(code: string, map: string) {
  const encoder = new TextEncoder()

  // Convert the strings to Uint8Array
  const codeArray = encoder.encode(code)
  const mapArray = encoder.encode(map)

  // Create Uint8Array for the lengths
  const codeLengthArray = encoder.encode(codeArray.length.toString())
  const mapLengthArray = encoder.encode(mapArray.length.toString())

  // Combine the lengths and the data
  const combinedArray = new Uint8Array(codeLengthArray.length + 1 + codeArray.length + mapLengthArray.length + 1 + mapArray.length)

  combinedArray.set(codeLengthArray)
  combinedArray.set([0], codeLengthArray.length)
  combinedArray.set(codeArray, codeLengthArray.length + 1)
  combinedArray.set(mapLengthArray, codeLengthArray.length + 1 + codeArray.length)
  combinedArray.set([0], codeLengthArray.length + 1 + codeArray.length + mapLengthArray.length)
  combinedArray.set(mapArray, codeLengthArray.length + 1 + codeArray.length + mapLengthArray.length + 1)

  // Convert the Uint8Array to a binary string
  let binary = ''
  const len = combinedArray.byteLength
  for (let i = 0; i < len; i++)
    binary += String.fromCharCode(combinedArray[i])

  // Convert the binary string to a base64 string and return it
  return btoa(binary)
}
