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
}

export interface ModulesList {
  root: string
  modules: ModuleInfo[]
}

export interface PluginMetricInfo {
  name: string
  totalTime: number
  invokeCount: number
  enforce?: string
}

export interface RPCFunctions {
  list(): ModulesList
  getIdInfo(id: string): {
    resolvedId: string
    transforms: TransformInfo[]
  }
  resolveId(id: string): string
  getPluginMetics(): PluginMetricInfo[]
  clear(id: string): void
}
