import { defineStore } from 'pinia'
import Fuse from 'fuse.js'
import { useOptionsStore } from './options'
import { usePayloadStore } from './payload'

export const useSearchResults = defineStore('search', () => {
  const state = useOptionsStore()
  const data = usePayloadStore()

  const filtered = computed(() => {
    let modules = data.modules || []

    if (!state.search.includeUnreached)
      modules = modules.filter(item => item.sourceSize)

    if (!state.search.includeNodeModules)
      modules = modules.filter(item => !item.id.includes('/node_modules/'))

    if (!state.search.includeVirtual)
      modules = modules.filter(item => !item.virtual)

    return modules
  })

  const results = computed(() => {
    const modules = filtered.value
    if (!state.search.text)
      return modules

    if (state.search.exactSearch) {
      return modules.filter(item =>
        item.id.includes(state.search.text)
        || item.plugins.some(plugin => plugin.name.includes(state.search.text)),
      )
    }
    else {
      const fuse = new Fuse(modules, {
        shouldSort: true,
        keys: ['id', 'plugins'],
      })
      return fuse.search(state.search.text).map(i => i.item)
    }
  })

  const resultsSorted = computed(() => {
    if (state.search.text)
      return results.value
    const cloned = [...results.value]
    if (state.view.sort === 'time-asc')
      cloned.sort((a, b) => b.totalTime - a.totalTime)
    if (state.view.sort === 'time-desc')
      cloned.sort((a, b) => a.totalTime - b.totalTime)
    return cloned
  })

  return {
    results,
    resultsSorted,
    filtered,
  }
})
