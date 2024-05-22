import type { RpcFunctions } from '../types'
import type { InspectContext } from './context'

export function createServerRpc(
  ctx: InspectContext,
): RpcFunctions {
  const rpc: RpcFunctions = {
    async getMetadata() {
      return {
        instances: [...ctx._idToInstances.values()]
          .map(vite => ({
            root: vite.config.root,
            vite: vite.id,
            environments: [...vite.environments.keys()],
          })),
      }
    },
    async getModulesList(query) {
      return ctx.queryEnv(query).getModulesList()
    },
    async getPluginMetrics(query) {
      return ctx.queryEnv(query).getPluginMetrics()
    },
    async getModuleTransformInfo(query, id, clear) {
      return ctx.queryEnv(query).getModuleTransformInfo(id, clear)
    },
    async resolveId(query, id) {
      return ctx.queryEnv(query).resolveId(id)
    },
    async onModuleUpdated() {},
  }

  return rpc
}
