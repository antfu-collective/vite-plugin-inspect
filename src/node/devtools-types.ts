import type { Metadata, ModulesList, ModuleTransformInfo, PluginMetricInfo, QueryEnv, ServerMetrics } from '../types'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'vite-plugin-inspect:getMetadata': () => Promise<Metadata>
    'vite-plugin-inspect:getModulesList': (query: QueryEnv) => Promise<ModulesList>
    'vite-plugin-inspect:getModuleTransformInfo': (query: QueryEnv, id: string, clear?: boolean) => Promise<ModuleTransformInfo>
    'vite-plugin-inspect:getPluginMetrics': (query: QueryEnv) => Promise<PluginMetricInfo[]>
    'vite-plugin-inspect:getServerMetrics': (query: QueryEnv) => Promise<ServerMetrics>
    'vite-plugin-inspect:resolveId': (query: QueryEnv, id: string) => Promise<string>
  }

  interface DevToolsRpcClientFunctions {
    'vite-plugin-inspect:onModuleUpdated': () => void
  }
}
