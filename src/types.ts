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

export interface HmrEventInfo {
  type: 'create' | 'update' | 'delete'
  file: string
  timestamp: number
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
  importers: string[]
  virtual: boolean
  totalTime: number
  invokeCount: number
  sourceSize: number
  distSize: number
}

export type ModulesList = ModuleInfo[]

export interface ModuleTransformInfo {
  resolvedId: string
  transforms: TransformInfo[]
}

export type WaterfallInfo = Record<string, {
  name: string
  start: number
  end: number
  isResolveId: boolean
}[]>

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

export interface ServerMetrics {
  middleware?: Record<string, { name: string, self: number, total: number }[]>
}

export interface HMRData {
  ids: (string | null)[]
}

export interface SerializedPlugin {
  name: string
  enforce?: string
  resolveId: string
  load: string
  transform: string
  generateBundle: string
  handleHotUpdate: string
  api: string
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
  /**
   * Plugins
   */
  plugins: SerializedPlugin[]
  /**
   * Environment plugins, the index of the plugin in the `plugins` array
   */
  environmentPlugins: Record<string, number[]>
}

export interface Metadata {
  instances: InstanceInfo[]
  embedded?: boolean
}

export interface RpcFunctions {
  getMetadata: () => Promise<Metadata>
  getModulesList: (query: QueryEnv) => Promise<ModulesList>
  getModuleTransformInfo: (query: QueryEnv, id: string, clear?: boolean) => Promise<ModuleTransformInfo>
  getPluginMetrics: (query: QueryEnv) => Promise<PluginMetricInfo[]>
  getServerMetrics: (query: QueryEnv) => Promise<ServerMetrics>
  getWaterfallInfo: (query: QueryEnv) => Promise<WaterfallInfo>
  getHmrEvents: (query: QueryEnv) => Promise<HmrEventInfo[]>
  resolveId: (query: QueryEnv, id: string) => Promise<string>
  onModuleUpdated: () => Promise<void>

  /**
   * @deprecated Query for the default Vite instance with the default env. Deprecated. Use `getModulesList` instead.
   */
  list: () => Promise<{
    root: string
    modules: ModulesList
    ssrModules: ModulesList
  }>
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
