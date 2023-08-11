import { createEventHook, useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import { rpc } from './rpc'
import { searchResults, searchText } from './search'

export const onRefetch = createEventHook<void>()
export const enableDiff = useStorage('vite-inspect-diff', true)
export const showOneColumn = useStorage('vite-inspect-one-column', false)
export const showBailout = useStorage('vite-inspect-bailout', false)
export const listMode = useStorage<'graph' | 'list' | 'detailed'>('vite-inspect-mode', 'detailed')
export const lineWrapping = useStorage('vite-inspect-line-wrapping', false)
export const inspectSSR = useStorage('vite-inspect-ssr', false)
export const metricDisplayHook = useStorage<'transform' | 'resolveId' | 'server'>('vite-inspect-metric-display-hook', 'transform')
export const sortMode = useStorage<'default' | 'time-asc' | 'time-desc'>('vite-inspect-sort', 'default')

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

const rules = [
  'default',
  'time-asc',
  'time-desc',
] as const

export function toggleSort() {
  sortMode.value = rules[(rules.indexOf(sortMode.value) + 1) % rules.length]
}

export const sortedSearchResults = computed(() => {
  if (searchText.value)
    return searchResults.value
  const clonedSearchResults = [...searchResults.value]
  if (sortMode.value === 'time-asc')
    clonedSearchResults.sort((a, b) => b.totalTime - a.totalTime)
  if (sortMode.value === 'time-desc')
    clonedSearchResults.sort((a, b) => a.totalTime - b.totalTime)
  return clonedSearchResults
})
