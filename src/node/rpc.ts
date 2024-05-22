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
      const vite = ctx.getViteContext(query.vite)
      const env = vite.getEnvContext(query.env)
      return env.getModulesList()
    },
    async moduleUpdated() {

    },
  }

  return rpc
}
