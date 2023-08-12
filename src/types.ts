import type { Awaitable } from '@antfu/utils'
import type { StackFrame } from 'error-stack-parser-es'

export interface TransformInfo {
  name: string
  result?: string
  start: number
  end: number
  order?: string
  sourcemaps?: any
  error?: ParsedError
}

export interface ResolveIdInfo {
  name: string
  result: string
  start: number
  end: number
  order?: string
  error?: ParsedError
}

export interface ParsedError {
  message: string
  stack: StackFrame[]
  raw?: any
}

export interface ModuleInfo {
  id: string
  plugins: { name: string; transform?: number; resolveId?: number }[]
  deps: string[]
  virtual: boolean
  totalTime: number
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
