export interface ParsedStack {
  method: string
  file: string
  line: number
  column: number
}

export function parseStack(line: string, ignore = ['node_modules', 'node:internal']) {
  const stack = parseSingleStack(line)

  if (!stack || (ignore.length && ignore.some(p => stack.file.includes(p))))
    return null

  return stack
}

export async function openInEditor(name: string, line: number, column: number) {
  const url = encodeURI(`${name}:${line}:${column}`)
  await fetch(`/__open-in-editor?file=${url}`)
}

function extractLocation(urlLike: string) {
  // Fail-fast but return locations like "(native)"
  if (!urlLike.includes(':'))
    return [urlLike]

  const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/
  const parts = regExp.exec(urlLike.replace(/^\(|\)$/g, ''))
  if (!parts)
    return [urlLike]
  return [parts[1], parts[2] || undefined, parts[3] || undefined]
}

// Based on https://github.com/stacktracejs/error-stack-parser
// Credit to stacktracejs
export function parseSingleStack(raw: string): ParsedStack | null {
  let line = raw.trim()

  if (line.includes('(eval '))
    line = line.replace(/eval code/g, 'eval').replace(/(\(eval at [^()]*)|(,.*$)/g, '')

  let sanitizedLine = line
    .replace(/^\s+/, '')
    .replace(/\(eval code/g, '(')
    .replace(/^.*?\s+/, '')

  // capture and preserve the parenthesized location "(/foo/my bar.js:12:87)" in
  // case it has spaces in it, as the string is split on \s+ later on
  const location = sanitizedLine.match(/ (\(.+\)$)/)

  // remove the parenthesized location from the line, if it was matched
  sanitizedLine = location ? sanitizedLine.replace(location[0], '') : sanitizedLine

  // if a location was matched, pass it to extractLocation() otherwise pass all sanitizedLine
  // because this line doesn't have function name
  const [url, lineNumber, columnNumber] = extractLocation(location ? location[1] : sanitizedLine)
  let method = (location && sanitizedLine) || ''
  let file = (url && ['eval', '<anonymous>'].includes(url)) ? undefined : url

  if (!file || !lineNumber || !columnNumber)
    return null

  if (method.startsWith('async '))
    method = method.slice(6)

  if (file.startsWith('file://'))
    file = file.slice(7)

  // normalize Windows path (\ -> /)
  file = file.replace(/\\/g, '/')

  return {
    method,
    file,
    line: Number.parseInt(lineNumber),
    column: Number.parseInt(columnNumber),
  }
}
