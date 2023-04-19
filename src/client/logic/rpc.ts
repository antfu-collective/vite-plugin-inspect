import { createRPCClient } from 'vite-dev-rpc'
import type { BirpcReturn } from 'birpc'
import { createHotContext } from 'vite-hot-client'
import type { ModuleTransformInfo, RPCFunctions } from '../../types'

export const isStaticMode = document.body.getAttribute('data-vite-inspect-mode') === 'BUILD'

function createStaticRpcClient(): RPCFunctions {
  async function getIdInfo(id: string, ssr = false): Promise<ModuleTransformInfo> {
    const { hash } = await import('ohash')
    return await fetch(`./reports/${ssr ? 'transform-ssr' : 'transform'}/${hash(id)}.json`).then(r => r.json())
  }

  return {
    list: async () => {
      return await fetch('./reports/list.json').then(r => r.json())
    },
    async resolveId(id, ssr) {
      return (await getIdInfo(id, ssr)).resolvedId || id
    },
    async clear() {},
    async getPluginMetrics(ssr: boolean) {
      try {
        return await fetch(`./reports/${ssr ? 'metrics-ssr' : 'metrics'}.json`).then(r => r.json())
      }
      catch (e) {
        return []
      }
    },
    async getServerMetrics() {
      return {}
    },
    getIdInfo,
  }
}

export const rpc = isStaticMode
  ? createStaticRpcClient() as BirpcReturn<RPCFunctions>
  : createRPCClient<RPCFunctions>('vite-plugin-inspect', (await createHotContext('/___', `${location.pathname.split('/__inspect')[0] || ''}/`.replace(/\/\//g, '/')))!)
