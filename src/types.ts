export interface TransformInfo {
  name: string
  result: string
  start: number
  end: number
  order?: string
}

export interface ModuleInfo {
  id: string
  plugins: string[]
  deps: string[]
  virtual: boolean
}

export interface ModulesList {
  root: string
  modules: ModuleInfo[]
  ssrModules: ModuleInfo[]
}

export interface PluginMetricInfo {
  name: string
  totalTime: number
  invokeCount: number
  enforce?: string
}

export interface RPCFunctions {
  list(): ModulesList
  getIdInfo(id: string, ssr: boolean): {
    resolvedId: string
    transforms: TransformInfo[]
  }
  resolveId(id: string, ssr: boolean): string
  getPluginMetrics(ssr?: boolean): PluginMetricInfo[]
  clear(id: string, ssr?: boolean): void
}
