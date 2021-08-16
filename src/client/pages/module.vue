<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { useFetch } from '@vueuse/core'
import { msToTime } from '../logic/utils'

const route = useRoute()
const id = computed(() => route?.query.id as string)

const currentIdx = ref(0)
const { data } = useFetch(computed(() => `/__inspect_api/id?id=${encodeURIComponent(id.value)}`))
  .get()
  .json<{ transforms: { name: string; end: number; start: number; result: string }[] }>()

watch(data, () => currentIdx.value = (data.value?.transforms?.length || 1) - 1)

const from = computed(() => data.value?.transforms[currentIdx.value - 1]?.result || '')
const to = computed(() => data.value?.transforms[currentIdx.value]?.result || '')
</script>

<template>
  <NavBar :id="id" />
  <div
    v-if="data && data.transforms"
    class="grid grid-cols-[300px,3fr] h-[calc(100vh-55px)] overflow-hidden"
  >
    <div class="flex flex-col border-r border-main">
      <div
        class="border-b border-main px-3 py-2 text-center text-sm tracking-widest text-gray-400"
      >TRANSFORM STACK</div>
      <template v-for="tr, idx of data.transforms" :key="tr.name">
        <button
          class="block border-b border-main px-3 py-2 text-left font-mono text-sm !outline-none"
          @click="currentIdx = idx"
        >
          <span :class="{ 'font-bold': currentIdx === idx }">{{ tr.name }}</span>
          <span class="ml-2 text-xs opacity-50">{{ msToTime(tr.end - tr.start) }}</span>
          <Badge
            v-if="tr.result === data.transforms[idx - 1]?.result"
            class="bg-orange-400/10 text-orange-400"
            v-text="'no change'"
          />
          <Badge v-if="idx === 0" class="bg-light-blue-400/10 text-light-blue-400" v-text="'load'" />
        </button>
      </template>
    </div>
    <DiffEditor :from="from" :to="to" />
  </div>
</template>
