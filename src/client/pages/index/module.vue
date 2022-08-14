<script setup lang="ts">
import type { Ref } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { msToTime } from '../../logic/utils'
import { enableDiff, lineWrapping, onRefetch, ssr } from '../../logic'
import { rpc } from '../../logic/rpc'

const route = useRoute()
const id = computed(() => route?.query.id as string)

const data = ref(await rpc.getIdInfo(id.value, ssr.value))
const index = useRouteQuery('index') as Ref<string>
const currentIndex = computed(() => +index.value ?? (data.value?.transforms.length || 1) - 1 ?? 0)

async function refetch() {
  let resolved = await rpc.resolveId(id.value, ssr.value)
  if (document.documentElement.dataset.mode === 'DEV') {
    if (resolved && !ssr.value) {
      // revaluate the module (if it's not initialized by the module graph)
      if (resolved) resolved = `/@fs/${resolved}`

      try {
        await fetch(resolved)
      } catch (_) {}
    } else {
      try {
        await rpc.preloadSSRModule(resolved)
      } catch (_) {}
    }
  }
  data.value = await rpc.getIdInfo(id.value, ssr.value)
}

onRefetch.on(async () => {
  await rpc.clear(id.value, ssr.value)
  await refetch()
})

watch(id, () => refetch(), { immediate: true })
watch(ssr, () => refetch(), { immediate: true })

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
  <Container v-if="data && data.transforms" class="grid grid-cols-[300px_3fr] overflow-hidden">
    <div class="flex flex-col border-r border-main">
      <div class="border-b border-main px-3 py-2 text-center text-sm tracking-widest text-gray-400">
        TRANSFORM STACK
      </div>
      <template v-for="(tr, idx) of data.transforms" :key="tr.name">
        <button
          class="block border-b border-main px-3 py-2 text-left font-mono text-sm !outline-none"
          :class="currentIndex === idx ? 'bg-main bg-opacity-10' : ''"
          @click="index = idx.toString()"
        >
          <span :class="currentIndex === idx ? 'font-bold' : ''">
            <PluginName :name="tr.name" />
          </span>
          <span class="ml-2 text-xs opacity-50">{{ msToTime(tr.end - tr.start) }}</span>
          <Badge
            v-if="tr.result === data.transforms[idx - 1]?.result"
            class="bg-orange-400/10 text-orange-400"
            v-text="'no change'"
          />
          <Badge
            v-if="idx === 0"
            class="bg-light-blue-400/10 text-light-blue-400"
            v-text="'load'"
          />
        </button>
      </template>
    </div>
    <DiffEditor :from="from" :to="to" />
  </Container>
</template>
