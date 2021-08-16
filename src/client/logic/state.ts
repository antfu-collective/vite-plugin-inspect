import { useFetch, createEventHook } from '@vueuse/core'
import { reactive, computed, ref } from 'vue'

export const onRefetch = createEventHook<void>()
export const enableDiff = ref(true)
export const lineWrapping = ref(false)

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
