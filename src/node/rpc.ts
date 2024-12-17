import type { RpcFunctions } from '../types'
import type { InspectContext } from './context'

export function createServerRpc(
  ctx: InspectContext,
): RpcFunctions {
  const rpc: RpcFunctions = {
    async getMetadata() {
      return ctx.getMetadata()
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
    async getServerMetrics(query) {
      return ctx.getViteContext(query.vite)
        .data
        .serverMetrics || {}
    },
    async getWaterfallInfo() {
      return ctx.getWaterfallInfo()
    },
    async onModuleUpdated() {},

    async list() {
      return {
        root: ctx.getViteContext('vite1').config.root,
        modules: await ctx.queryEnv({ vite: 'vite1', env: 'client' }).getModulesList(),
        ssrModules: await ctx.queryEnv({ vite: 'vite1', env: 'server' }).getModulesList(),
      }
    },
  }

  return rpc
}
