import { createEventHook, useFetch, useStorage } from '@vueuse/core'
import { computed, reactive } from 'vue'
import type { ModuleInfo } from '../../types'

export const onRefetch = createEventHook<void>()
export const enableDiff = useStorage('vite-inspect-diff', true)
export const listMode = useStorage<'graph' | 'list' | 'detailed'>('vite-inspect-mode', 'detailed')
export const lineWrapping = useStorage('vite-inspect-line-wrapping', false)

export const list = reactive(
  useFetch('/__inspect_api/list')
    .get()
    .json<{ root: string; modules: ModuleInfo[] }>(),
)

const modes = [
  'detailed',
  'graph',
  'list',
] as const

export function toggleMode() {
  listMode.value = modes[(modes.indexOf(listMode.value) + 1) % modes.length]
}

export const root = computed(() => list.data?.root || '')

export function refetch() {
  onRefetch.trigger()
  return list.execute()
}
