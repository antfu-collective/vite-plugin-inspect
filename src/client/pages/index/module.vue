<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { Pane, Splitpanes } from 'splitpanes'
import { msToTime } from '../../logic/utils'
import { enableDiff, inspectSSR, inspectSourcemaps, lineWrapping, onRefetch, safeJsonParse, showOneColumn } from '../../logic'
import { rpc } from '../../logic/rpc'
import type { HMRData } from '../../../types'
import { getHot } from '../../logic/hot'

const id = useRouteQuery<string | undefined>('id')
const data = ref(id.value ? await rpc.getIdInfo(id.value, inspectSSR.value) : undefined)
const index = useRouteQuery<string | undefined>('index')
const currentIndex = computed(() => (index.value != null ? +index.value : null) ?? (data.value?.transforms.length || 1) - 1)
const panelSize = useLocalStorage('vite-inspect-module-panel-size', '10')

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
const sourcemaps = computed(() => {
  let sourcemaps = data.value?.transforms[currentIndex.value]?.sourcemaps
  if (!sourcemaps)
    return undefined
  if (typeof sourcemaps === 'string')
    sourcemaps = safeJsonParse(sourcemaps)
  if (!sourcemaps?.mappings)
    return

  if (sourcemaps && !sourcemaps.sourcesContent) {
    sourcemaps.sourcesContent = []
    sourcemaps.sourcesContent[0] = from
  }
  return JSON.stringify(sourcemaps)
})

getHot().then((hot) => {
  if (hot) {
    hot.on('vite-plugin-inspect:update', ({ ids }: HMRData) => {
      if (id.value && ids.includes(id.value))
        refetch()
    })
  }
})
</script>

<template>
  <NavBar>
    <RouterLink my-auto outline-none icon-btn to="/">
      <div i-carbon-arrow-left />
    </RouterLink>
    <ModuleId v-if="id" :id="id" />
    <Badge
      v-if="inspectSSR"
      bg-teal-400:10 font-bold text-teal-400
    >
      SSR
    </Badge>
    <div flex-auto />

    <button text-lg icon-btn title="Inspect SSR" @click="inspectSSR = !inspectSSR">
      <div i-carbon-cloud-services :class="inspectSSR ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Inspect sourcemaps" :disabled="!sourcemaps" @click="inspectSourcemaps({ code: to, sourcemaps })">
      <div i-carbon-choropleth-map :class="sourcemaps ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Line Wrapping" @click="lineWrapping = !lineWrapping">
      <div i-carbon-text-wrap :class="lineWrapping ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Toggle one column" @click="showOneColumn = !showOneColumn">
      <div v-if="showOneColumn" i-carbon-side-panel-open />
      <div v-else i-carbon-side-panel-close />
    </button>
    <button class="text-lg icon-btn" title="Toggle Diff" @click="enableDiff = !enableDiff">
      <div i-carbon-compare :class="enableDiff ? 'opacity-100' : 'opacity-25'" />
    </button>
  </NavBar>
  <Container
    v-if="data && data.transforms"
    flex overflow-hidden
  >
    <Splitpanes h-full of-hidden @resize="panelSize = $event[0].size">
      <Pane
        :size="panelSize" min-size="10"
        flex="~ col" border="r main"
        overflow-y-auto
      >
        <div px-3 py-2 text-center text-sm tracking-widest op50>
          {{ inspectSSR ? 'SSR ' : '' }}TRANSFORM STACK
        </div>
        <div border="b main" />
        <template v-for="tr, idx of data.transforms" :key="tr.name">
          <button
            border="b main"
            flex="~ gap-1 wrap"
            items-center px-2 py-2 text-left text-xs font-mono
            :class="
              currentIndex === idx
                ? 'bg-active'
                : tr.result === data.transforms[idx - 1]?.result
                  ? 'op50'
                  : ''
            "
            @click="index = idx.toString()"
          >
            <span :class="currentIndex === idx ? 'font-bold' : ''">
              <PluginName :name="tr.name" />
            </span>
            <Badge
              v-if="tr.result === data.transforms[idx - 1]?.result"
              bg-orange-400:10 text-orange-400
              v-text="'no change'"
            />
            <Badge
              v-if="idx === 0"
              class="bg-light-blue-400/10 text-light-blue-400"
              v-text="'load'"
            />
            <Badge
              v-if="tr.order && tr.order !== 'normal'"
              bg-rose-400:10 text-rose-400
              :title="tr.order.includes('-') ? `Using object hooks ${tr.order}` : tr.order"
              v-text="tr.order"
            />
            <span flex-auto text-right text-xs op50>{{ msToTime(tr.end - tr.start) }}</span>
          </button>
        </template>
      </Pane>
      <Pane min-size="5">
        <div h-full of-auto>
          <DiffEditor :from="from" :to="to" h-unset />
        </div>
      </Pane>
    </Splitpanes>
  </Container>
</template>
