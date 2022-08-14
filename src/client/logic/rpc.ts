import { createRPCClient } from 'vite-dev-rpc'
import { hot } from 'vite-hot-client'
import type { ModuleInfo, PluginMetricInfo, RPCFunctions } from '../../types'

async function createBuildRpcClient(): Promise<RPC> {
  let root: string
  let modulesMap: Record<string, { id: string; client?: ModuleInfo; ssr?: ModuleInfo }> = {}
  try {
    let json = (await (await fetch('/transforms/ssr/_modules.json')).json()) as {
      root: string
      modules: ModuleInfo[]
    }

    root = json.root
    json.modules.forEach((m, index) => {
      modulesMap[m.id] = modulesMap[m.id] || {}
      modulesMap[m.id].id = m.id
      modulesMap[m.id].ssr = m
    })
  } catch (e) {}

  try {
    let json = (await (await fetch('/transforms/client/_modules.json')).json()) as {
      root: string
      modules: ModuleInfo[]
    }

    root = json.root
    json.modules.forEach((m, index) => {
      modulesMap[m.id] = modulesMap[m.id] || {}
      modulesMap[m.id].id = m.id
      modulesMap[m.id].client = m
    })
  } catch (e) {}

  let modules = Object.keys(modulesMap)
    .sort()
    .map((id) => modulesMap[id])

  return {
    list: async (ssr?: boolean) => {
      return {
        root,
        modules,
      }
    },
    resolveId(id) {
      return id
    },
    async clear() {},
    async preloadSSRModule() {},
    async getPluginMetrics(ssr: boolean) {
      return (await (
        await fetch(`/metrics/${ssr ? 'ssr' : 'client'}.json`)
      ).json()) as PluginMetricInfo[]
    },
    async getIdInfo(id, ssr) {
      let mod = modules.find((i: any) => i.id === id)
      let m = mod![ssr ? 'ssr' : 'client']

      if (!m) {
        return {
          resolvedId: id,
          transforms: [],
        }
      }

      const transforms = await (
        await fetch(`/transforms/${ssr ? 'ssr' : 'client'}/${m.index}.json`)
      ).json()

      return {
        resolvedId: id,
        transforms: transforms.transforms ?? [],
      }
    },
  }
}

type RPC = {
  [k in keyof RPCFunctions]: (...args: any[]) => Promise<any>
}

export const rpc =
  document.documentElement.dataset.mode === 'DEV'
    ? (createRPCClient<RPCFunctions>('vite-plugin-inspect', hot as any) as any)
    : (createBuildRpcClient() as any)
