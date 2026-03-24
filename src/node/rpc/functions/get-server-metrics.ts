import type { QueryEnv } from '../../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getInspectContext } from '../ctx'
import { getAllQueryEnvs } from '../utils'

export const getServerMetrics = defineRpcFunction({
  name: 'vite-plugin-inspect:get-server-metrics',
  type: 'query',
  setup: (devtoolsCtx) => {
    const ctx = getInspectContext(devtoolsCtx)
    return {
      handler: async (query: QueryEnv) =>
        ctx.getViteContext(query.vite).data.serverMetrics || {},
      dump: { inputs: getAllQueryEnvs(ctx).map(q => [q] as [QueryEnv]) },
    }
  },
})
