import { useFetch, createEventHook, useStorage } from '@vueuse/core'
import { reactive, computed } from 'vue'

export const onRefetch = createEventHook<void>()
export const enableDiff = useStorage('vite-inspect-diff', true)
export const lineWrapping = useStorage('vite-inspect-line-wrapping', false)
export const showPluginNames = useStorage('vite-inspect-show-plugin-names', false)

export const list = reactive(
  useFetch('/__inspect_api/list')
    .get()
    .json<{ root: string; modules: { id: string; virtual: boolean}[] }>(),
)

export const root = computed(() => list.data?.root || '')

export function refetch() {
  onRefetch.trigger()
  return list.execute()
}
