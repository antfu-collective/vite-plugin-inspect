import type { BirpcReturn } from 'birpc'
import type { RpcFunctions } from '../../types'
import { createRPCClient } from 'vite-dev-rpc'
import { createHotContext } from 'vite-hot-client'
import { createStaticRpcClient } from './rpc-static'

export const onModuleUpdated = createEventHook<void>()

export const isStaticMode = document.body.getAttribute('data-vite-inspect-mode') === 'BUILD'

const hot = createHotContext('/___', `${location.pathname.split('/__inspect')[0] || ''}/`.replace(/\/\//g, '/'))

export const rpc = isStaticMode
  ? createStaticRpcClient() as BirpcReturn<RpcFunctions>
  : createRPCClient<RpcFunctions, Pick<RpcFunctions, 'onModuleUpdated'>>(
    'vite-plugin-inspect',
    hot,
    {
      async onModuleUpdated() {
        onModuleUpdated.trigger()
      },
    },
  )
