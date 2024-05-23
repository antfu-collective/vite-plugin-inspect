import { defineStore } from 'pinia'
import type { Metadata, ModuleInfo, QueryEnv } from '../../types'
import { isStaticMode, onModuleUpdated, rpc } from '../logic/rpc'

export const usePayloadStore = defineStore('payload', () => {
  const isLoading = ref(false)
  const metadata = shallowRef<Metadata>({
    instances: [],
  })
  const query = ref<QueryEnv>({
    vite: '',
    env: '',
  })

  const route = useRoute()
  const router = useRouter()

  const modules = shallowRef<readonly ModuleInfo[]>([])
  const queryCache = new Map<string, Promise<readonly ModuleInfo[]>>()

  async function init() {
    metadata.value = await rpc.getMetadata()
    query.value.vite ||= (route.query.vite as string) || metadata.value.instances[0].vite
    query.value.env ||= (route.query.env as string) || metadata.value.instances[0].environments[0] || 'client'
    await doQuery()

    watch(
      query,
      async () => {
        router.push({
          path: route.path,
          query: {
            ...route.query,
            vite: query.value.vite,
            env: query.value.env,
          },
        })
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
