<script setup lang="ts">
import type { Ref } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { msToTime } from '../../logic/utils'
import { enableDiff, lineWrapping, onRefetch } from '../../logic'

const route = useRoute()
const id = computed(() => route?.query.id as string)

const { data, execute } = useFetch(computed(() => `/__inspect_api/module?id=${encodeURIComponent(id.value)}`), { immediate: false })
  .get()
  .json<{ resolvedId: string; transforms: { name: string; end: number; start: number; result: string }[] }>()

const index = useRouteQuery('index') as Ref<string>
const currentIndex = computed(() => +index.value ?? (data.value?.transforms.length || 1) - 1 ?? 0)

async function refetch() {
  const { id: resolved } = await fetch(`/__inspect_api/resolve?id=${id.value}`).then(r => r.json())
  if (resolved) {
    // revaluate the module (if it's not initialized by the module graph)
    let resolvedId = resolved.value
    if (resolvedId && resolvedId.startsWith('file:///'))
      resolvedId = `/@fs/${resolvedId.slice(8)}`

    try {
      await fetch(resolvedId)
    }
    catch (_) {}
  }
  await execute()
}

onRefetch.on(async() => {
  await fetch(`/__inspect_api/clear?id=${id.value}`)
  await refetch()
})

watch(id, () => refetch(), { immediate: true })

const from = computed(() => data.value?.transforms[currentIndex.value - 1]?.result || '')
const to = computed(() => data.value?.transforms[currentIndex.value]?.result || '')
</script>

<template>
  <NavBar>
    <router-link class="icon-btn !outline-none my-auto" to="/">
      <carbon-arrow-left />
    </router-link>
    <ModuleId v-if="id" :id="id" />
    <div class="flex-auto" />
    <button class="icon-btn text-lg" title="Line Wrapping" @click="lineWrapping = !lineWrapping">
      <carbon:text-wrap :class="lineWrapping ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button class="icon-btn text-lg" title="Toggle Diff" @click="enableDiff = !enableDiff">
      <carbon:compare :class="enableDiff ? 'opacity-100' : 'opacity-25'" />
    </button>
  </NavBar>
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
          :class="currentIndex === idx ? 'bg-main bg-opacity-10' : ''"
          @click="index = idx.toString()"
        >
          <span :class="currentIndex === idx ? 'font-bold' : ''">{{ tr.name }}</span>
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
