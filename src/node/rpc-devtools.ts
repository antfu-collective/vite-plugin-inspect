import type { QueryEnv } from '../types'
import type { InspectContext } from './context'
import { defineRpcFunction } from '@vitejs/devtools-kit'

function getAllQueryEnvs(ctx: InspectContext): QueryEnv[] {
  const result: QueryEnv[] = []
  for (const vite of ctx._idToInstances.values()) {
    for (const envName of vite.environments.keys()) {
      result.push({ vite: vite.id, env: envName })
    }
  }
  return result
}

function getAllModuleIds(ctx: InspectContext): [QueryEnv, string][] {
  const result: [QueryEnv, string][] = []
  for (const vite of ctx._idToInstances.values()) {
    for (const [envName, env] of vite.environments) {
      const query: QueryEnv = { vite: vite.id, env: envName }
      for (const id of Object.keys(env.data.transform)) {
        result.push([query, id])
      }
    }
  }
  return result
}

export function createDevToolsRpcFunctions(ctx: InspectContext) {
  return [
    defineRpcFunction({
      name: 'vite-plugin-inspect:get-metadata',
      type: 'query',
      setup: () => ({
        handler: async () => ctx.getMetadata(),
        dump: { inputs: [[]] as [] [] },
      }),
    }),

    defineRpcFunction({
      name: 'vite-plugin-inspect:get-modules-list',
      type: 'query',
      setup: () => ({
        handler: async (query: QueryEnv) => ctx.queryEnv(query).getModulesList(),
        dump: { inputs: getAllQueryEnvs(ctx).map(q => [q] as [QueryEnv]) },
      }),
    }),

    defineRpcFunction({
      name: 'vite-plugin-inspect:get-plugin-metrics',
      type: 'query',
      setup: () => ({
        handler: async (query: QueryEnv) => ctx.queryEnv(query).getPluginMetrics(),
        dump: { inputs: getAllQueryEnvs(ctx).map(q => [q] as [QueryEnv]) },
      }),
    }),

    defineRpcFunction({
      name: 'vite-plugin-inspect:get-module-transform-info',
      type: 'query',
      setup: () => ({
        handler: async (query: QueryEnv, id: string, clear?: boolean) =>
          ctx.queryEnv(query).getModuleTransformInfo(id, clear),
        dump: { inputs: getAllModuleIds(ctx).map(([q, id]) => [q, id] as [QueryEnv, string]) },
      }),
    }),

    defineRpcFunction({
      name: 'vite-plugin-inspect:resolve-id',
      type: 'query',
      setup: () => ({
        handler: async (query: QueryEnv, id: string) => ctx.queryEnv(query).resolveId(id),
        dump: { inputs: getAllModuleIds(ctx).map(([q, id]) => [q, id] as [QueryEnv, string]) },
      }),
    }),

    defineRpcFunction({
      name: 'vite-plugin-inspect:get-server-metrics',
      type: 'query',
      setup: () => ({
        handler: async (query: QueryEnv) =>
          ctx.getViteContext(query.vite).data.serverMetrics || {},
        dump: { inputs: getAllQueryEnvs(ctx).map(q => [q] as [QueryEnv]) },
      }),
    }),
  ]
}
