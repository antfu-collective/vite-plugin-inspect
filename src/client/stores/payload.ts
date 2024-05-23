import { defineStore } from 'pinia'
import type { Metadata, ModuleInfo, QueryEnv } from '../../types'
import { isStaticMode, onModuleUpdated, rpc } from '../logic/rpc'

export const usePayloadStore = defineStore('payload', () => {
  const isLoading = ref(false)
  const metadata = shallowRef<Metadata>({
    instances: [],
  })
  const query = useLocalStorage<QueryEnv>(
    'vite-inspect-v1-query',
    {
      vite: '',
      env: '',
    },
    { mergeDefaults: true },
  )

  const modules = shallowRef<readonly ModuleInfo[]>([])
  const queryCache = new Map<string, Promise<readonly ModuleInfo[]>>()

  async function init() {
    metadata.value = await rpc.getMetadata()

    if (!metadata.value.instances.some(i => i.vite === query.value.vite))
      query.value.vite = metadata.value.instances[0].vite
    if (!metadata.value.instances.some(i => i.vite === query.value.vite && i.environments.includes(query.value.env))) {
      const instance = metadata.value.instances.find(i => i.vite === query.value.vite)
      if (instance)
        query.value.env = instance.environments[0] || 'client'
      else
        query.value.env = metadata.value.instances[0].environments[0] || 'client'
    }

    await doQuery()

    watch(
      query,
      async () => {
        await doQuery()
      },
      { deep: true },
    )

    onModuleUpdated.on(() => refetch())
  }

  async function doQuery() {
    const key = `${query.value.vite}-${query.value.env}`
    if (!queryCache.has(key))
      queryCache.set(key, rpc.getModulesList(query.value))
    isLoading.value = true
    modules.value = []
    try {
      modules.value = Object.freeze(await queryCache.get(key))!
    }
    finally {
      isLoading.value = false
    }
  }

  async function refetch(force = false) {
    queryCache.clear()
    if (force)
      metadata.value = await rpc.getMetadata()
    await doQuery()
  }

  const instance = computed(() => metadata.value.instances.find(i => i.vite === query.value.vite)!)
  const root = computed(() => instance.value.root)

  return {
    init,
    metadata,
    query,
    modules,
    instance,
    root,
    isLoading,
    isStatic: isStaticMode,
    refetch,
  }
})
