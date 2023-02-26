<script setup lang="ts">
import type { Ref } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { hot } from 'vite-hot-client'
import { Pane, Splitpanes } from 'splitpanes'
import { msToTime } from '../../logic/utils'
import { enableDiff, inspectSSR, lineWrapping, onRefetch, showOneColumn } from '../../logic'
import { rpc } from '../../logic/rpc'
import type { HMRData } from '../../../types'

const id = useRouteQuery<string | undefined>('id')
const data = ref(id.value ? await rpc.getIdInfo(id.value, inspectSSR.value) : undefined)
const index = useRouteQuery('index') as Ref<string>
const currentIndex = computed(() => +index.value ?? (data.value?.transforms.length || 1) - 1 ?? 0)

async function refetch() {
  if (id.value)
    data.value = await rpc.getIdInfo(id.value, inspectSSR.value, true)
}

onRefetch.on(async () => {
  await refetch()
})

watch([id, inspectSSR], refetch)

const from = computed(() => data.value?.transforms[currentIndex.value - 1]?.result || '')
const to = computed(() => data.value?.transforms[currentIndex.value]?.result || '')

if (hot) {
  hot.on('vite-plugin-inspect:update', ({ ids }: HMRData) => {
    if (id.value && ids.includes(id.value))
      refetch()
  })
}
</script>

<template>
  <NavBar>
    <router-link class="icon-btn !outline-none my-auto" to="/">
      <carbon-arrow-left />
    </router-link>
    <ModuleId v-if="id" :id="id" />
    <Badge
      v-if="inspectSSR"
      class="bg-teal-400/10 text-teal-400 font-bold"
    >
      SSR
    </Badge>
    <div class="flex-auto" />

    <button class="icon-btn text-lg" title="Inspect SSR" @click="inspectSSR = !inspectSSR">
      <carbon:cloud-services :class="inspectSSR ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button class="icon-btn text-lg" title="Line Wrapping" @click="lineWrapping = !lineWrapping">
      <carbon:text-wrap :class="lineWrapping ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button class="icon-btn text-lg" title="Toggle one column" @click="showOneColumn = !showOneColumn">
      <carbon-side-panel-open v-if="showOneColumn" />
      <carbon-side-panel-close v-else />
    </button>
    <button class="icon-btn text-lg" title="Toggle Diff" @click="enableDiff = !enableDiff">
      <carbon:compare :class="enableDiff ? 'opacity-100' : 'opacity-25'" />
    </button>
  </NavBar>
  <Container
    v-if="data && data.transforms"
    class="flex overflow-hidden"
  >
    <Splitpanes>
      <Pane size="20" min-size="5" class="flex flex-col border-r border-main overflow-y-auto">
        <div
          class="border-b border-main px-3 py-2 text-center text-sm tracking-widest text-gray-400"
        >
          {{ inspectSSR ? 'SSR ' : '' }}TRANSFORM STACK
        </div>
        <template v-for="tr, idx of data.transforms" :key="tr.name">
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
            <Badge v-if="idx === 0" class="bg-light-blue-400/10 text-light-blue-400" v-text="'load'" />
            <Badge
              v-if="tr.order && tr.order !== 'normal'"
              class="bg-rose-400/10 text-rose-400"
              :title="tr.order.includes('-') ? `Using object hooks ${tr.order}` : tr.order"
              v-text="tr.order"
            />
          </button>
        </template>
      </Pane>
      <Pane>
        <DiffEditor :from="from" :to="to" />
      </Pane>
    </Splitpanes>
  </Container>
</template>
