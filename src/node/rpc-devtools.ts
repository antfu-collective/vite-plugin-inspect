import type { InspectContext } from './context'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export function createDevToolsRpcFunctions(ctx: InspectContext) {
  return [
    defineRpcFunction({
      name: 'inspect:getMetadata',
      type: 'query',
      setup: () => ({
        handler: async () => ctx.getMetadata(),
      }),
    }),

    defineRpcFunction({
      name: 'inspect:getModulesList',
      type: 'query',
      setup: () => ({
        handler: async query => ctx.queryEnv(query).getModulesList(),
      }),
    }),

    defineRpcFunction({
      name: 'inspect:getPluginMetrics',
      type: 'query',
      setup: () => ({
        handler: async query => ctx.queryEnv(query).getPluginMetrics(),
      }),
    }),

    defineRpcFunction({
      name: 'inspect:getModuleTransformInfo',
      type: 'query',
      setup: () => ({
        handler: async (query, id, clear) =>
          ctx.queryEnv(query).getModuleTransformInfo(id, clear),
      }),
    }),

    defineRpcFunction({
      name: 'inspect:resolveId',
      type: 'query',
      setup: () => ({
        handler: async (query, id) => ctx.queryEnv(query).resolveId(id),
      }),
    }),

    defineRpcFunction({
      name: 'inspect:getServerMetrics',
      type: 'query',
      setup: () => ({
        handler: async query =>
          ctx.getViteContext(query.vite).data.serverMetrics || {},
      }),
    }),
  ]
}
