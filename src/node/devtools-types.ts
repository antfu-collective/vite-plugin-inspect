import type { Metadata, ModulesList, ModuleTransformInfo, PluginMetricInfo, QueryEnv, ServerMetrics } from '../types'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'inspect:getMetadata': () => Promise<Metadata>
    'inspect:getModulesList': (query: QueryEnv) => Promise<ModulesList>
    'inspect:getModuleTransformInfo': (query: QueryEnv, id: string, clear?: boolean) => Promise<ModuleTransformInfo>
    'inspect:getPluginMetrics': (query: QueryEnv) => Promise<PluginMetricInfo[]>
    'inspect:getServerMetrics': (query: QueryEnv) => Promise<ServerMetrics>
    'inspect:resolveId': (query: QueryEnv, id: string) => Promise<string>
  }

  interface DevToolsRpcClientFunctions {
    'inspect:onModuleUpdated': () => void
  }
}
