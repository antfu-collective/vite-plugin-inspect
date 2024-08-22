import type { QueryEnv, RpcFunctions } from '../../types'

const dataCache = new Map<string, Promise<any>>()

function fetchJson(url: string): Promise<any> {
  if (!dataCache.has(url))
    dataCache.set(url, fetch(url).then(r => r.json()))
  return dataCache.get(url)!
}

export function createStaticRpcClient(): RpcFunctions {
  async function getModuleTransformInfo(query: QueryEnv, id: string) {
    const { hash } = await import('ohash')
    return fetchJson(`./reports/${query.vite}-${query.env}/transforms/${hash(id)}.json`)
  }

  return {
    getMetadata: () => fetchJson('./reports/metadata.json'),
    getModulesList: query => fetchJson(`./reports/${query.vite}-${query.env}/modules.json`),
    getPluginMetrics: query => fetchJson(`./reports/${query.vite}-${query.env}/metric-plugins.json`),
    getModuleTransformInfo,
    resolveId: (query, id) => getModuleTransformInfo(query, id).then(r => r.resolvedId),
    onModuleUpdated: async () => undefined,
    getServerMetrics: async () => ({}),
  }
}
