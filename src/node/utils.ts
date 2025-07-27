import type { Plugin } from 'vite'
import type { SerializedPlugin } from '../types'

export async function openBrowser(address: string) {
  await import('open')
    .then(r => r.default(address, { newInstance: true }))
    .catch(() => {})
}

export function serializePlugin(plugin: Plugin): SerializedPlugin {
  return JSON.parse(JSON.stringify(plugin, (key, value) => {
    if (typeof value === 'function') {
      let name = value.name
      if (name === 'anonymous')
        name = ''
      if (name === key)
        name = ''
      if (name)
        return `[Function ${name}]`
      return '[Function]'
    }
    if (key === 'api' && value)
      return '[Object API]'
    return value
  }))
}

export function removeVersionQuery(url: string) {
  if (url.includes('v=')) {
    return url
      .replace(/&v=\w+/, '')
      .replace(/\?v=\w+/, '?')
      .replace(/\?$/, '')
  }
  return url
}

export function createFilter(pattern: string) {
  pattern = pattern.trim()
  if (!pattern) {
    return () => true
  }
  const regex = new RegExp(pattern, 'i')
  return (name: string) => regex.test(name)
}

export function generatorHashColorByString(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  let color = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF
    color += (`00${value.toString(16)}`).slice(-2)
  }
  return color
}
