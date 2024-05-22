<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { Pane, Splitpanes } from 'splitpanes'
import {
  // enableDiff,
  // inspectSSR,
  inspectSourcemaps,
  // lineWrapping,
  onRefetch,
  safeJsonParse,
  // showBailout,
  // showOneColumn,
} from '../../logic'
import { rpc } from '../../logic/rpc'
import type { HMRData } from '../../../types'
import { getHot } from '../../logic/hot'
import { useStateStore } from '../../stores/state'
import { useDataStore } from '../../stores/data'

function getModuleId(fullPath?: string) {
  if (!fullPath)
    return undefined

  return new URL(fullPath, 'http://localhost').searchParams.get('id') || undefined
}

const state = useStateStore()
const payload = useDataStore()

const route = useRoute()
const module = getModuleId(route.fullPath)
const id = computed(() => getModuleId(route.fullPath))
const data = ref(module ? await rpc.getModuleTransformInfo(payload.query, module) : undefined)
const index = useRouteQuery<string | undefined>('index')
const currentIndex = computed(() => (index.value != null ? +index.value : null) ?? (data.value?.transforms.length || 1) - 1)
const panelSize = useLocalStorage('vite-inspect-module-panel-size', '10')

const transforms = computed(() => {
  const trs = data.value?.transforms
  if (!trs)
    return undefined

  let load = false

  return trs
    .map((tr, index) => ({
      ...tr,
      noChange: !!tr.result && index > 0 && tr.result === trs[index - 1]?.result,
      load: tr.result && (load ? false : (load = true)),
      index,
    }))
})
const filteredTransforms = computed(() =>
  transforms.value?.filter(tr => state.view.showBailout || tr.result),
)

async function refetch(clear = false) {
  if (id.value)
    data.value = await rpc.getModuleTransformInfo(payload.query, id.value, clear)
}

onRefetch.on(async () => {
  await refetch(true)
})

watch(
  () => [id.value, payload.query],
  () => refetch(false),
  { deep: true },
)

const lastTransform = computed(() =>
  transforms.value?.slice(0, currentIndex.value).reverse().find(tr => tr.result),
)
const currentTransform = computed(() => transforms.value?.find(tr => tr.index === currentIndex.value))
const from = computed(() => lastTransform.value?.result || '')
const to = computed(() => currentTransform.value?.result || from.value)
const sourcemaps = computed(() => {
  let sourcemaps = currentTransform.value?.sourcemaps
  if (!sourcemaps)
    return undefined
  if (typeof sourcemaps === 'string')
    sourcemaps = safeJsonParse(sourcemaps)
  if (!sourcemaps?.mappings)
    return

  if (sourcemaps && !sourcemaps.sourcesContent?.filter(Boolean)?.length)
    sourcemaps.sourcesContent = [from.value]

  // sometimes sources is [null]
  if (sourcemaps && !sourcemaps.sources?.filter(Boolean)?.length)
    sourcemaps.sources = ['index.js']

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
    <QuerySelector />
    <div flex-auto />

    <!-- <button text-lg icon-btn title="Inspect SSR" @click="inspectSSR = !inspectSSR">
      <div i-carbon-cloud-services :class="inspectSSR ? 'opacity-100' : 'opacity-25'" />
    </button> -->
    <button text-lg icon-btn :title="sourcemaps ? 'Inspect sourcemaps' : 'Sourcemap is not available'" :disabled="!sourcemaps" @click="inspectSourcemaps({ code: to, sourcemaps })">
      <div i-carbon-choropleth-map :class="sourcemaps ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Line Wrapping" @click="state.view.lineWrapping = !state.view.lineWrapping">
      <div i-carbon-text-wrap :class="state.view.lineWrapping ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Toggle one column" @click="state.view.showOneColumn = !state.view.showOneColumn">
      <div v-if="state.view.showOneColumn" i-carbon-side-panel-open />
      <div v-else i-carbon-side-panel-close />
    </button>
    <button class="text-lg icon-btn" title="Toggle Diff" @click="state.view.diff = !state.view.diff">
      <div i-carbon-compare :class="state.view.diff ? 'opacity-100' : 'opacity-25'" />
    </button>
  </NavBar>
  <Container
    v-if="data && filteredTransforms"
    flex overflow-hidden
  >
    <Splitpanes h-full of-hidden @resize="panelSize = $event[0].size">
      <Pane
        :size="panelSize" min-size="10"
        flex="~ col" border="r main"
        overflow-y-auto
      >
        <div flex="~ gap2 items-center" p2 tracking-widest class="op75 dark:op50">
          <span flex-auto text-center text-sm>TRANSFORM STACK</span>
          <button
            class="icon-btn" title="Toggle bailout plugins"
            @click="state.view.showBailout = !state.view.showBailout"
          >
            <div :class="state.view.showBailout ? 'opacity-100 i-carbon-view' : 'opacity-50 i-carbon-view-off'" />
          </button>
        </div>
        <div border="b main" />
        <template v-for="tr of filteredTransforms" :key="tr.index">
          <button
            border="b main"
            flex="~ gap-1 wrap"
            items-center px-2 py-2 text-left text-xs font-mono
            :class="
              currentIndex === tr.index
                ? 'bg-active'
                : tr.noChange || !tr.result
                  ? 'op50'
                  : ''
            "
            @click="index = tr.index.toString()"
          >
            <span :class="currentIndex === tr.index ? 'font-bold' : ''">
              <PluginName :name="tr.name" />
            </span>
            <Badge
              v-if="!tr.result"
              class="bg-gray-400:10 text-gray-700 dark:text-gray-400"
              v-text="'bailout'"
            />
            <Badge
              v-else-if="tr.noChange"
              class="bg-orange-400:10 text-orange-800 dark:text-orange-400"
              v-text="'no change'"
            />
            <Badge
              v-if="tr.load"
              class="bg-light-blue-400/10 text-blue-700 dark:text-light-blue-400"
              v-text="'load'"
            />
            <Badge
              v-if="tr.order && tr.order !== 'normal'"
              class="bg-violet-400:10 text-violet-700 dark:text-violet-400"
              :title="tr.order.includes('-') ? `Using object hooks ${tr.order}` : tr.order"
              v-text="tr.order"
            />
            <Badge
              v-if="tr.error"
              class="bg-red-400:10 text-red7 dark:text-red-400"
              v-text="'error'"
            />
            <div flex-auto />
            <DurationDisplay :duration="tr.end - tr.start" />
          </button>
        </template>
      </Pane>
      <Pane min-size="5">
        <div h-full of-auto>
          <ErrorDisplay
            v-if="currentTransform?.error"
            :key="`error-${id}`"
            :error="currentTransform.error"
          />
          <DiffEditor
            v-else
            :key="id"
            :one-column="state.view.showOneColumn || !!currentTransform?.error"
            :diff="state.view.diff && !currentTransform?.error"
            :from="from" :to="to"
            h-unset
          />
        </div>
      </Pane>
    </Splitpanes>
  </Container>
</template>
