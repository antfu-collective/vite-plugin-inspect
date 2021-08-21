<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { useFetch } from '@vueuse/core'
import { msToTime } from '../logic/utils'
import { onRefetch } from '../logic'

const route = useRoute()
const id = computed(() => route?.query.id as string)

const currentIdx = ref(0)
const { data, execute } = useFetch(computed(() => `/__inspect_api/module?id=${encodeURIComponent(id.value)}`), { immediate: false })
  .get()
  .json<{ resolvedId: string; transforms: { name: string; end: number; start: number; result: string }[] }>()

async function refetch() {
  const { id: resolved } = await fetch(`/__inspect_api/resolve?id=${id.value}`).then(r => r.json())
  if (resolved) {
  // revaluate the module (if it's not initialized by the module graph)
    try { await fetch(resolved) }
    catch (e) {}
  }
  await execute()
}

onRefetch.on(async() => {
  await fetch(`/__inspect_api/clear?id=${id.value}`)
  await refetch()
})

refetch()

watch(data, () => currentIdx.value = (data.value?.transforms?.length || 1) - 1)

const from = computed(() => data.value?.transforms[currentIdx.value - 1]?.result || '')
const to = computed(() => data.value?.transforms[currentIdx.value]?.result || '')
</script>

<template>
  <NavBar :id="id" />
  <Container
    v-if="data && data.transforms"
    class="grid grid-cols-[300px,3fr] overflow-hidden"
  >
    <div class="flex flex-col border-r border-main">
      <div
        class="border-b border-main px-3 py-2 text-center text-sm tracking-widest text-gray-400"
      >
        TRANSFORM STACK
      </div>
      <template v-for="tr, idx of data.transforms" :key="tr.name">
        <button
          class="block border-b border-main px-3 py-2 text-left font-mono text-sm !outline-none"
          :class="currentIdx === idx ? 'bg-main bg-opacity-10' : ''"
          @click="currentIdx = idx"
        >
          <span :class="currentIdx === idx ? 'font-bold' : ''">{{ tr.name }}</span>
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
  </Container>
</template>
