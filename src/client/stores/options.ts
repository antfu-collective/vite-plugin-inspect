import { defineStore } from 'pinia'

// @keep-sorted
export interface ViewState {
  diff: boolean
  graphWeightMode: 'deps' | 'transform' | 'resolveId'
  lineWrapping: boolean
  listMode: 'graph' | 'list' | 'detailed'
  metricDisplayHook: 'transform' | 'resolveId' | 'server'
  panelSizeDiff: number
  panelSizeModule: number
  showBailout: boolean
  showOneColumn: boolean
  sort: 'default' | 'time-asc' | 'time-desc'
}

export interface SearchState {
  text: string
  includeNodeModules: boolean
  includeVirtual: boolean
  includeUnreached: boolean
  exactSearch: boolean
}

export const useOptionsStore = defineStore('options', () => {
  const view = useLocalStorage<ViewState>(
    'vite-inspect-v1-options',
    // @keep-sorted
    {
      diff: true,
      graphWeightMode: 'deps',
      lineWrapping: false,
      listMode: 'detailed',
      metricDisplayHook: 'transform',
      panelSizeDiff: 30,
      panelSizeModule: 10,
      showBailout: false,
      showOneColumn: false,
      sort: 'default',
    },
    { mergeDefaults: true },
  )

  const search = useLocalStorage<SearchState>(
    'vite-inspect-v1-search',
    {
      text: '',
      includeNodeModules: false,
      includeVirtual: false,
      includeUnreached: false,
      exactSearch: false,
    },
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
