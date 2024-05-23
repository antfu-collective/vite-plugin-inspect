<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { Pane, Splitpanes } from 'splitpanes'
import {
  inspectSourcemaps,
  safeJsonParse,
} from '../../logic'
import { isStaticMode, onModuleUpdated, onUserRefresh, rpc } from '../../logic/rpc'
import type { HMRData } from '../../../types'
import { getHot } from '../../logic/hot'
import { useOptionsStore } from '../../stores/options'
import { usePayloadStore } from '../../stores/payload'

function getModuleId(fullPath?: string) {
  if (!fullPath)
    return undefined

  return new URL(fullPath, 'http://localhost').searchParams.get('id') || undefined
}

const options = useOptionsStore()
const payload = usePayloadStore()

const route = useRoute()
const module = getModuleId(route.fullPath)
const id = computed(() => getModuleId(route.fullPath))
const data = ref(module ? await rpc.getModuleTransformInfo(payload.query, module) : undefined)
const index = useRouteQuery<string | undefined>('index')
const currentIndex = computed(() => (index.value != null ? +index.value : null) ?? (data.value?.transforms.length || 1) - 1)

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
  transforms.value?.filter(tr => options.view.showBailout || tr.result),
)

async function refetch(clear = false) {
  if (id.value)
    data.value = await rpc.getModuleTransformInfo(payload.query, id.value, clear)
}

onModuleUpdated.on(async () => {
  await refetch(false)
})

onUserRefresh.on(async (name) => {
  if (name === 'module')
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
  <NavBar name="module">
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
    <button text-lg icon-btn title="Line Wrapping" @click="options.view.lineWrapping = !options.view.lineWrapping">
      <div i-carbon-text-wrap :class="options.view.lineWrapping ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Toggle one column" @click="options.view.showOneColumn = !options.view.showOneColumn">
      <div v-if="options.view.showOneColumn" i-carbon-side-panel-open />
      <div v-else i-carbon-side-panel-close />
    </button>
    <button class="text-lg icon-btn" title="Toggle Diff" @click="options.view.diff = !options.view.diff">
      <div i-carbon-compare :class="options.view.diff ? 'opacity-100' : 'opacity-25'" />
    </button>
  </NavBar>
  <div v-if="!data?.transforms.length" flex="~ col gap-2 items-center justify-center" h-full>
    <div>No transform data for this module in the <Badge :text="payload.query.env" size="none" color px1 py0.5 line-height-1em /> env</div>
    <button v-if="!isStaticMode" rounded bg-teal5 px2 py1 text-white @click="refetch(true)">
      Request the module
    </button>
  </div>
  <Container
    v-else-if="data && filteredTransforms"
    flex overflow-hidden
  >
    <Splitpanes h-full of-hidden @resize="options.view.panelSizeModule = $event[0].size">
      <Pane
        :size="options.view.panelSizeModule" min-size="10"
        flex="~ col" border="r main"
        overflow-y-auto
      >
        <div flex="~ gap2 items-center" p2 tracking-widest class="op75 dark:op50">
          <span flex-auto text-center text-sm uppercase>{{ payload.query.env }} TRANSFORM STACK</span>
          <button
            class="icon-btn" title="Toggle bailout plugins"
            @click="options.view.showBailout = !options.view.showBailout"
          >
            <div :class="options.view.showBailout ? 'opacity-100 i-carbon-view' : 'opacity-50 i-carbon-view-off'" />
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
              text="bailout"
            />
            <Badge
              v-else-if="tr.noChange"
              text="no change"
              :color="20"
            />
            <Badge
              v-if="tr.load"
              text="load"
              color
            />
            <Badge
              v-if="tr.order && tr.order !== 'normal'"
              :title="tr.order.includes('-') ? `Using object hooks ${tr.order}` : tr.order"
              :text="tr.order" color
            />
            <Badge
              v-if="tr.error"
              text="error"
              color
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
            :one-column="options.view.showOneColumn || !!currentTransform?.error"
            :diff="options.view.diff && !currentTransform?.error"
            :from="from" :to="to"
            h-unset
          />
        </div>
      </Pane>
    </Splitpanes>
  </Container>
</template>
