import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getInspectContext } from '../ctx'

export const getMetadata = defineRpcFunction({
  name: 'vite-plugin-inspect:get-metadata',
  type: 'query',
  setup: (devtoolsCtx) => {
    const ctx = getInspectContext(devtoolsCtx)
    return {
      handler: async () => ctx.getMetadata(),
      dump: { inputs: [[]] as [][] },
    }
  },
})
