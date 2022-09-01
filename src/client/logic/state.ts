import { createEventHook, useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import { hot } from 'vite-hot-client'
import { rpc } from './rpc'

export const onRefetch = createEventHook<void>()
export const enableDiff = useStorage('vite-inspect-diff', true)
export const listMode = useStorage<'graph' | 'list' | 'detailed'>('vite-inspect-mode', 'detailed')
export const lineWrapping = useStorage('vite-inspect-line-wrapping', false)

export const list = ref(await rpc.list())

const modes = [
  'detailed',
  'graph',
  'list',
] as const

export function toggleMode() {
  listMode.value = modes[(modes.indexOf(listMode.value) + 1) % modes.length]
}

export const root = computed(() => list.value?.root || '')

export async function refetch() {
  onRefetch.trigger()
  list.value = await rpc.list()
  return list.value
}
hot?.on('special-update', refetch)
