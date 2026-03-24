import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

export const onModuleUpdated = createEventHook<void>()

export const isStaticMode = document.body.getAttribute('data-vite-inspect-mode') === 'BUILD'

// eslint-disable-next-line antfu/no-top-level-await
const client = await getDevToolsRpcClient()

client.client.register({
  name: 'vite-plugin-inspect:on-module-updated',
  type: 'action',
  handler: () => {
    onModuleUpdated.trigger()
  },
})

export const rpc = client
