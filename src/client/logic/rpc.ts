import { createRPCClient } from 'vite-dev-rpc'
import type { BirpcReturn } from 'birpc'
import { createHotContext } from 'vite-hot-client'
import type { RpcFunctions } from '../../types'
import { createStaticRpcClient } from './rpc-static'

export const onModuleUpdated = createEventHook<void>()

export const isStaticMode = document.body.getAttribute('data-vite-inspect-mode') === 'BUILD'

export const rpc = isStaticMode
  ? createStaticRpcClient() as BirpcReturn<RpcFunctions>
  : createRPCClient<RpcFunctions, Pick<RpcFunctions, 'onModuleUpdated'>>(
    'vite-plugin-inspect',
    (await createHotContext('/___', `${location.pathname.split('/__inspect')[0] || ''}/`.replace(/\/\//g, '/')))!,
    {
      async onModuleUpdated() {
        onModuleUpdated.trigger()
      },
    },
  )
