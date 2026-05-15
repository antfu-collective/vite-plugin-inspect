import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'

export const onModuleUpdated = createEventHook<void>()

// eslint-disable-next-line antfu/no-top-level-await
const client = await getDevToolsRpcClient({ baseURL: DEVTOOLS_MOUNT_PATH })

export const isStaticMode = client.connectionMeta.backend === 'static'

client.client.register({
  name: 'vite-plugin-inspect:on-module-updated',
  type: 'action',
  handler: () => {
    onModuleUpdated.trigger()
  },
})

export const rpc = client
