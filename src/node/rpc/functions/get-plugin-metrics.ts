import type { QueryEnv } from '../../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getInspectContext } from '../ctx'
import { getAllQueryEnvs } from '../utils'

export const getPluginMetrics = defineRpcFunction({
  name: 'vite-plugin-inspect:get-plugin-metrics',
  type: 'query',
  setup: (devtoolsCtx) => {
    const ctx = getInspectContext(devtoolsCtx)
    return {
      handler: async (query: QueryEnv) => ctx.queryEnv(query).getPluginMetrics(),
      dump: { inputs: getAllQueryEnvs(ctx).map(q => [q] as [QueryEnv]) },
    }
  },
})
