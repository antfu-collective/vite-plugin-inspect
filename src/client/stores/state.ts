import { defineStore } from 'pinia'

export interface ViewState {
  diff: boolean
  lineWrapping: boolean
  showOneColumn: boolean
  showBailout: boolean
  listMode: 'graph' | 'list' | 'detailed'
  sort: 'default' | 'time-asc' | 'time-desc'
  metricDisplayHook: 'transform' | 'resolveId' | 'server'
}

export interface SearchState {
  text: string
  includeNodeModules: boolean
  includeVirtual: boolean
  exactSearch: boolean
}

export const useStateStore = defineStore('state', () => {
  const view = useStorage<ViewState>(
    'vite-inspect-v1-options',
    {
      diff: true,
      lineWrapping: false,
      showOneColumn: false,
      showBailout: false,
      listMode: 'detailed',
      sort: 'default',
      metricDisplayHook: 'transform',
    },
    undefined,
    { mergeDefaults: true },
  )

  const search = useStorage<SearchState>(
    'vite-inspect-v1-search',
    {
      text: '',
      includeNodeModules: false,
      includeVirtual: false,
      exactSearch: false,
    },
    undefined,
    { mergeDefaults: true },
  )

  function toggleSort() {
    const rules = [
      'default',
      'time-asc',
      'time-desc',
    ] as const

    view.value.sort = rules[(rules.indexOf(view.value.sort) + 1) % rules.length]
  }

  function toggleListMode() {
    const modes = [
      'detailed',
      'graph',
      'list',
    ] as const
    view.value.listMode = modes[(modes.indexOf(view.value.listMode) + 1) % modes.length]
  }

  return {
    view,
    search,
    toggleSort,
    toggleListMode,
  }
})
