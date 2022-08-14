export interface TransformInfo {
  name: string
  result: string
  start: number
  end: number
}

export interface ModuleInfo {
  id: string
  plugins: string[]
  deps: string[]
  virtual: boolean
  ssr: boolean
  index?: number
}

export interface ModulesList {
  root: string
  modules: { client: ModuleInfo; ssr: ModuleInfo }[]
}

export interface PluginMetricInfo {
  name: string
  totalTime: number
  invokeCount: number
  enforce?: string
}

export interface RPCFunctions {
  list(ssr?: boolean): ModulesList
  getIdInfo(
    id: string,
    ssr?: boolean
  ): {
    resolvedId: string
    transforms: TransformInfo[]
  }
  resolveId(id: string, ssr?: boolean): string
  getPluginMetrics(ssr?: boolean): PluginMetricInfo[]
  preloadSSRModule(id: string): void
  clear(id: string, ssr?: boolean): void
}
