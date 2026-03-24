import type { QueryEnv } from '../../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getInspectContext } from '../ctx'

export const clearModuleTransform = defineRpcFunction({
  name: 'vite-plugin-inspect:clear-module-transform',
  type: 'action',
  setup: (devtoolsCtx) => {
    const ctx = getInspectContext(devtoolsCtx)
    return {
      handler: async (query: QueryEnv, id: string) => {
        await ctx.queryEnv(query).clearModuleTransform(id)
      },
    }
  },
})
