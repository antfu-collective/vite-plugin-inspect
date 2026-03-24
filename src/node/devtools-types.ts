import type { Metadata, ModulesList, ModuleTransformInfo, PluginMetricInfo, QueryEnv, ServerMetrics } from '../types'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'vite-plugin-inspect:get-metadata': () => Promise<Metadata>
    'vite-plugin-inspect:get-modules-list': (query: QueryEnv) => Promise<ModulesList>
    'vite-plugin-inspect:get-module-transform-info': (query: QueryEnv, id: string, clear?: boolean) => Promise<ModuleTransformInfo>
    'vite-plugin-inspect:get-plugin-metrics': (query: QueryEnv) => Promise<PluginMetricInfo[]>
    'vite-plugin-inspect:get-server-metrics': (query: QueryEnv) => Promise<ServerMetrics>
    'vite-plugin-inspect:resolve-id': (query: QueryEnv, id: string) => Promise<string>
  }

  interface DevToolsRpcClientFunctions {
    'vite-plugin-inspect:on-module-updated': () => void
  }
}
