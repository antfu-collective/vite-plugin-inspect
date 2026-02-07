import type { InspectContext } from './context'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export function createDevToolsRpcFunctions(ctx: InspectContext) {
  return [
    defineRpcFunction({
      name: 'vite-plugin-inspect:getMetadata',
      type: 'query',
      setup: () => ({
        handler: async () => ctx.getMetadata(),
      }),
    }),

    defineRpcFunction({
      name: 'vite-plugin-inspect:getModulesList',
      type: 'query',
      setup: () => ({
        handler: async query => ctx.queryEnv(query).getModulesList(),
      }),
    }),

    defineRpcFunction({
      name: 'vite-plugin-inspect:getPluginMetrics',
      type: 'query',
      setup: () => ({
        handler: async query => ctx.queryEnv(query).getPluginMetrics(),
      }),
    }),

    defineRpcFunction({
      name: 'vite-plugin-inspect:getModuleTransformInfo',
      type: 'query',
      setup: () => ({
        handler: async (query, id, clear) =>
          ctx.queryEnv(query).getModuleTransformInfo(id, clear),
      }),
    }),

    defineRpcFunction({
      name: 'vite-plugin-inspect:resolveId',
      type: 'query',
      setup: () => ({
        handler: async (query, id) => ctx.queryEnv(query).resolveId(id),
      }),
    }),

    defineRpcFunction({
      name: 'vite-plugin-inspect:getServerMetrics',
      type: 'query',
      setup: () => ({
        handler: async query =>
          ctx.getViteContext(query.vite).data.serverMetrics || {},
      }),
    }),
  ]
}
