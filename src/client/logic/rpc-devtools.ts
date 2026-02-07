import type { BirpcReturn } from 'birpc'
import type { RpcFunctions } from '../../types'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

let clientPromise: Promise<any> | null = null

export async function createDevToolsRpcClient(onModuleUpdated: () => void): Promise<BirpcReturn<RpcFunctions>> {
  // Ensure we only create one client instance and set up client functions
  if (!clientPromise) {
    // Set up the client RPC functions that the server can call
    const clientFunctions = {
      'vite-plugin-inspect:onModuleUpdated': () => {
        onModuleUpdated()
      },
    }

    // Get the DevTools RPC client and extend it with our client functions
    clientPromise = getDevToolsRpcClient().then((client) => {
      // Register our client function handler
      // The DevTools Kit should automatically wire this up via the type augmentation
      Object.assign(client, clientFunctions)
      return client
    })
  }

  const client = await clientPromise

  // Map namespaced DevTools RPC to legacy interface
  return {
    getMetadata: () => client.call('vite-plugin-inspect:getMetadata'),
    getModulesList: (query: any) => client.call('vite-plugin-inspect:getModulesList', query),
    getPluginMetrics: (query: any) => client.call('vite-plugin-inspect:getPluginMetrics', query),
    getModuleTransformInfo: (query: any, id: string, clear?: boolean) =>
      client.call('vite-plugin-inspect:getModuleTransformInfo', query, id, clear),
    resolveId: (query: any, id: string) => client.call('vite-plugin-inspect:resolveId', query, id),
    getServerMetrics: (query: any) => client.call('vite-plugin-inspect:getServerMetrics', query),
    onModuleUpdated: async () => {},
  } as any
}
