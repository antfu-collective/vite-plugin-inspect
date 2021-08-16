<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, ref } from 'vue'
import { useFetch } from '@vueuse/core'
import { msToTime } from '../logic/utils'

const route = useRoute()
const id = computed(() => route?.query.id as string)

const currentIdx = ref(0)
const { data } = useFetch(computed(() => `/__inspect_api/id?id=${encodeURIComponent(id.value)}`))
  .get()
  .json<{transforms: {name: string; end: number; start: number; result: string}[]}>()

const from = computed(() => data.value?.transforms[currentIdx.value - 1]?.result || '')
const to = computed(() => data.value?.transforms[currentIdx.value]?.result || '')
</script>

<template>
  <NavBar :name="id"/>
  <div v-if="data && data.transforms" class="grid grid-cols-[300px,3fr] h-[calc(100vh-55px)] overflow-hidden">
    <div class="flex flex-col">
      <button
        v-for="tr, idx of data.transforms"
        :key="tr.name"
        class="block border-b border-main px-3 py-2 text-left font-mono text-sm !outline-none"
        :class="{ 'font-bold': currentIdx === idx }"
        @click="currentIdx = idx"
      >
        {{ tr.name }} <span class="text-xs opacity-50">{{ msToTime(tr.end - tr.start) }}</span>
      </button>
    </div>
    <DiffEditor :from="from" :to="to" />
  </div>
</template>
