import { defineStore } from 'pinia'
import Fuse from 'fuse.js'
import { useStateStore } from './state'
import { useDataStore } from './data'

export const useSearchResults = defineStore('search', () => {
  const state = useStateStore()
  const data = useDataStore()

  const results = computed(() => {
    let modules = data.modules || []

    if (!state.search.includeNodeModules)
      modules = modules.filter(item => !item.id.includes('/node_modules/'))

    if (!state.search.includeVirtual)
      modules = modules.filter(item => !item.virtual)

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
    const clonedSearchResults = [...results.value]
    if (state.view.sort === 'time-asc')
      clonedSearchResults.sort((a, b) => b.totalTime - a.totalTime)
    if (state.view.sort === 'time-desc')
      clonedSearchResults.sort((a, b) => a.totalTime - b.totalTime)
    return clonedSearchResults
  })

  return {
    results,
    resultsSorted,
  }
})
