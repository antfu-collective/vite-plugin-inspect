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
  latency: number
  invokeCount: number
  enforce?: string
}
