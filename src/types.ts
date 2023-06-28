import type { Awaitable } from '@antfu/utils'

export interface TransformInfo {
  name: string
  result: string
  start: number
  end: number
  order?: string
  sourcemaps?: string | Record<string, any>
}

export interface ResolveIdInfo {
  name: string
  result: string
  start: number
  end: number
  order?: string
}

export interface ModuleInfo {
  id: string
  plugins: { name: string; transform?: number; resolveId?: number }[]
  deps: string[]
  virtual: boolean
}

export interface ModulesList {
  root: string
  modules: ModuleInfo[]
  ssrModules: ModuleInfo[]
}

export interface ModuleTransformInfo {
  resolvedId: string
  transforms: TransformInfo[]
}

export interface PluginMetricInfo {
  name: string
  enforce?: string
  transform: {
    invokeCount: number
    totalTime: number
  }
  resolveId: {
    invokeCount: number
    totalTime: number
  }
}

export interface RPCFunctions {
  list(): Awaitable<ModulesList>
  getIdInfo(id: string, ssr: boolean, clear?: boolean): Awaitable<ModuleTransformInfo>
  resolveId(id: string, ssr: boolean): Awaitable<string>
  clear(id: string, ssr: boolean): Awaitable<void>
  getPluginMetrics(ssr: boolean): Awaitable<PluginMetricInfo[]>
  getServerMetrics(): Awaitable<Record<string, Record<string, { name: string; self: number; total: number }[]>>>
}

export interface HMRData {
  ids: (string | null)[]
}
