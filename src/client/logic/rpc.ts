import type { BirpcReturn } from 'birpc'
import type { RpcFunctions } from '../../types'
import { createDevToolsRpcClient } from './rpc-devtools'
import { createStaticRpcClient } from './rpc-static'

export const onModuleUpdated = createEventHook<void>()

// Mode detection
export const isStaticMode = document.body.getAttribute('data-vite-inspect-mode') === 'BUILD'

// Create RPC client based on mode
let rpcClientPromise: Promise<BirpcReturn<RpcFunctions>> | null = null

function getRpcClient(): Promise<BirpcReturn<RpcFunctions>> {
  if (!rpcClientPromise) {
    rpcClientPromise = (async () => {
      // Build mode: use static JSON files
      if (isStaticMode) {
        return createStaticRpcClient() as BirpcReturn<RpcFunctions>
      }

      // Dev mode: always use DevTools RPC (works in both standalone and iframe modes)
      return await createDevToolsRpcClient(() => {
        onModuleUpdated.trigger()
      })
    })()
  }
  return rpcClientPromise
}

// eslint-disable-next-line antfu/no-top-level-await
export const rpc = await getRpcClient()
