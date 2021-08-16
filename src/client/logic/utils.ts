import { root } from './state'

export function msToTime(ms: number) {
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

export function clearRoot(path: string) {
  if (path.startsWith(root.value))
    return path.slice(root.value.length)
  return path
}

export function guessMode(code: string) {
  if (code.match(/^import\s/))
    return 'javascript'
  if (code.includes('<template>\n'))
    return 'vue'
  if (code.includes('<html>\n'))
    return 'html'
  if (code.match(/^[.#].+\{/))
    return 'css'
  return 'javascript'
}
