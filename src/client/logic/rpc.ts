import type { BirpcReturn } from 'birpc'
import type { ModuleTransformInfo, RPCFunctions } from '../../types'
import { createRPCClient } from 'vite-dev-rpc'
import { createHotContext } from 'vite-hot-client'
import { refetch } from './state'

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
      catch {
        return []
      }
    },
    async getServerMetrics() {
      return {}
    },
    getIdInfo,
    moduleUpdated() {},
  }
}

export const rpc = isStaticMode
  ? createStaticRpcClient() as BirpcReturn<RPCFunctions>
  : createRPCClient<RPCFunctions, Pick<RPCFunctions, 'moduleUpdated'>>(
    'vite-plugin-inspect',
    (createHotContext('/___', `${location.pathname.split('/__inspect')[0] || ''}/`.replace(/\/\//g, '/')))!,
    {
      moduleUpdated() {
        refetch()
      },
    },
  )
