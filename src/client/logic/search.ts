import { useStorage } from '@vueuse/core'
import { computed } from 'vue'
import Fuse from 'fuse.js'
import { list, ssr } from './state'

export const searchText = useStorage('vite-inspect-search-text', '')
export const includeNodeModules = useStorage('vite-inspect-include-node-modules', false)
export const includeVirtual = useStorage('vite-inspect-include-virtual', false)

export const searchResults = computed(() => {
  let mods = list.value?.modules || []

  let mode = ssr.value ? ('ssr' as 'ssr') : ('client' as 'client')

  let data = mods.map((d) => d[mode]).filter(Boolean)

  if (!includeNodeModules.value) data = data.filter((item) => !item.id.includes('/node_modules/'))

  if (!includeVirtual.value) data = data.filter((item) => !item.virtual)

  if (!searchText.value) return data

  const fuse = new Fuse(data, {
    shouldSort: true,
    keys: ['id', 'plugins'],
  })

  return fuse.search(searchText.value).map((i) => i.item)
})
