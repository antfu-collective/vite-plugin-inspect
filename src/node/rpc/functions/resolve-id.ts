import type { QueryEnv } from '../../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getInspectContext } from '../ctx'
import { getAllModuleIds } from '../utils'

export const resolveId = defineRpcFunction({
  name: 'vite-plugin-inspect:resolve-id',
  type: 'query',
  setup: (devtoolsCtx) => {
    const ctx = getInspectContext(devtoolsCtx)
    return {
      handler: async (query: QueryEnv, id: string) => ctx.queryEnv(query).resolveId(id),
      dump: { inputs: getAllModuleIds(ctx).map(([q, id]) => [q, id] as [QueryEnv, string]) },
    }
  },
})
