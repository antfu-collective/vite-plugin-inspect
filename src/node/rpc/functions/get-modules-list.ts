import type { QueryEnv } from '../../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getInspectContext } from '../ctx'
import { getAllQueryEnvs } from '../utils'

export const getModulesList = defineRpcFunction({
  name: 'vite-plugin-inspect:get-modules-list',
  type: 'query',
  setup: (devtoolsCtx) => {
    const ctx = getInspectContext(devtoolsCtx)
    return {
      handler: async (query: QueryEnv) => ctx.queryEnv(query).getModulesList(),
      dump: { inputs: getAllQueryEnvs(ctx).map(q => [q] as [QueryEnv]) },
    }
  },
})
