import { useFetch } from '@vueuse/core'
import { reactive, computed, ref } from 'vue'

export const enableDiff = ref(true)

export const list = reactive(
  useFetch('/__inspect_api/list')
    .get()
    .json<{ root: string; modules: { id: string; virtual: boolean}[] }>(),
)

export const root = computed(() => list.data?.root || '')
