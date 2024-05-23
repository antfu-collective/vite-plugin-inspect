import { defineStore } from 'pinia'
import type { Metadata, ModulesList, QueryEnv } from '../../types'
import { onModuleUpdated, rpc } from '../logic/rpc'

export const usePayloadStore = defineStore('payload', () => {
  const isLoading = ref(false)
  const metadata = shallowRef<Metadata>({
    instances: [],
  })
  const query = ref<QueryEnv>({
    vite: 'vite1',
    env: 'client',
  })
  const modules = shallowRef<ModulesList>([])
  const queryCache = new Map<string, Promise<ModulesList>>()

  async function init() {
    metadata.value = await rpc.getMetadata()
    query.value.vite = metadata.value.instances[0].vite
    query.value.env = metadata.value.instances[0].environments[0] || 'client'
    await doQuery()

    watch(
      query.value,
      () => doQuery(),
      { deep: true },
    )

    onModuleUpdated.on(async () => {
      queryCache.clear()
      await doQuery()
    })
  }

  async function doQuery() {
    const key = `${query.value}-${query.value.env}`
    if (!queryCache.has(key))
      queryCache.set(key, rpc.getModulesList(query.value))
    isLoading.value = true
    modules.value = []
    try {
      modules.value = await queryCache.get(key)!
    }
    finally {
      isLoading.value = false
    }
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
  }
})
