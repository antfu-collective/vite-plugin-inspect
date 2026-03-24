import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { clearModuleTransform } from './functions/clear-module-transform'
import { getMetadata } from './functions/get-metadata'
import { getModuleTransformInfo } from './functions/get-module-transform-info'
import { getModulesList } from './functions/get-modules-list'
import { getPluginMetrics } from './functions/get-plugin-metrics'
import { getServerMetrics } from './functions/get-server-metrics'
import { resolveId } from './functions/resolve-id'

export { setInspectContext } from './ctx'

export const rpcFunctions = [
  clearModuleTransform,
  getMetadata,
  getModulesList,
  getPluginMetrics,
  getModuleTransformInfo,
  resolveId,
  getServerMetrics,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}

  interface DevToolsRpcClientFunctions {
    'vite-plugin-inspect:on-module-updated': () => void
  }
}
