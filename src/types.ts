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
  plugins: { name: string, transform?: number, resolveId?: number }[]
  deps: string[]
  virtual: boolean
  totalTime: number
  invokeCount: number
  sourceSize: number
  distSize: number
}

export interface ModulesList {
  root: string
  modules: ModuleInfo[]
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

export interface HMRData {
  ids: (string | null)[]
}

export interface InstanceInfo {
  root: string
  /**
   * Vite instance ID
   */
  vite: string
  /**
   * Environment names
   */
  environments: string[]
}

export interface Metadata {
  instances: InstanceInfo[]
}

export interface RpcFunctions {
  getMetadata: () => Promise<Metadata>
  getModulesList: (query: QueryEnv) => Promise<ModulesList>
  moduleUpdated: () => Promise<void>
}

export interface QueryEnv {
  /**
   * Vite instance ID
   */
  vite: string
  /**
   * Environment name
   */
  env: string
}

export interface QueryId extends QueryEnv {
  /**
   * Module Id
   */
  id: string
}
