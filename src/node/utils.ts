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
