import { createEventHook, useStorage } from '@vueuse/core'
// import { computed, ref } from 'vue'
// import type { ModulesList, QueryEnv } from '../../types'
// import { rpc } from './rpc'

export const onRefetch = createEventHook<void>()
// export const enableDiff = useStorage('vite-inspect-diff', true)
// export const showOneColumn = useStorage('vite-inspect-one-column', false)
// export const showBailout = useStorage('vite-inspect-bailout', false)
// export const listMode = useStorage<'graph' | 'list' | 'detailed'>('vite-inspect-mode', 'detailed')
// export const lineWrapping = useStorage('vite-inspect-line-wrapping', false)
// export const inspectSSR = useStorage('vite-inspect-ssr', false)
// export const metricDisplayHook = useStorage<'transform' | 'resolveId' | 'server'>('vite-inspect-metric-display-hook', 'transform')
// export const sortMode = useStorage<'default' | 'time-asc' | 'time-desc'>('vite-inspect-sort', 'default')

// export const metadata = shallowRef(await rpc.getMetadata())
// export const currentQuery = ref<QueryEnv>({
//   vite: metadata.value.instances[0].vite,
//   env: metadata.value.instances[0].environments[0] || 'client',
// })
// export const currentModules = shallowRef<ModulesList>(await rpc.getModulesList(currentQuery.value))

// export const currentInstance = computed(() => metadata.value.instances.find(i => i.vite === currentQuery.value.vite)!)
// export const root = computed(() => currentInstance.value.root)

// const queryCache = new Map<string, Promise<ModulesList>>()

// async function doQuery() {
//   const key = `${currentQuery.value}-${currentQuery.value.env}`
//   if (!queryCache.has(key))
//     queryCache.set(key, rpc.getModulesList(currentQuery.value))
//   currentModules.value = await queryCache.get(key)!
// }

// await doQuery()

export async function refetch() {
  onRefetch.trigger()
  // Todo: fine-grain
  // queryCache.clear()
  // await doQuery()
}
