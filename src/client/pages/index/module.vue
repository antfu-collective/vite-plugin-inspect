<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { Pane, Splitpanes } from 'splitpanes'
import { Dropdown } from 'floating-vue'
import {
  inspectSourcemaps,
  safeJsonParse,
} from '../../logic'
import { isStaticMode, onModuleUpdated, rpc } from '../../logic/rpc'
import type { HMRData, ModuleInfo } from '../../../types'
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
const id = computed(() => getModuleId(route.fullPath))
const info = ref(id.value ? await rpc.getModuleTransformInfo(payload.query, id.value) : undefined)
const mod = computed(() => payload.modules.find(m => m.id === id.value))
const index = useRouteQuery<string | undefined>('index')
const currentIndex = computed(() => (index.value != null ? +index.value : null) ?? (info.value?.transforms.length || 1) - 1)

const deps = computed(() => {
  return mod.value?.deps
    .map(dep => payload.modules.find(m => m.id === dep) as ModuleInfo)
    .filter(Boolean)
})

const importers = computed(() => {
  return mod.value?.importers
    .map(dep => payload.modules.find(m => m.id === dep) as ModuleInfo)
    .filter(Boolean)
})

const transforms = computed(() => {
  const trs = info.value?.transforms
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
    info.value = await rpc.getModuleTransformInfo(payload.query, id.value, clear)
}

onModuleUpdated.on(async () => {
  await refetch(false)
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
    <div flex-auto />

    <QuerySelector />
    <template v-if="deps?.length || importers?.length">
      <div mx1 h-full w-0 border="r main" />
      <Dropdown v-if="deps?.length">
        <button title="Dependencies" flex="~ gap-2 items-center" text-lg icon-btn>
          <div i-carbon-downstream />
          <span line-height-1em>{{ deps.length }}</span>
        </button>
        <template #popper>
          <div max-h-400 max-w-200 of-auto>
            <ModuleList :modules="deps" />
          </div>
        </template>
      </Dropdown>
      <Dropdown v-if="importers?.length">
        <button title="Importers" flex="~ gap-2 items-center" text-lg icon-btn>
          <div i-carbon-upstream />
          <span line-height-1em>{{ importers.length }}</span>
        </button>
        <template #popper>
          <div max-h-400 max-w-200 of-auto>
            <ModuleList :modules="importers" />
          </div>
        </template>
      </Dropdown>
    </template>
    <div mx1 h-full w-0 border="r main" />
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
    <button
      v-if="!payload.isStatic"
      class="text-lg icon-btn" title="Refetch"
      @click="refetch(true)"
    >
      <div i-carbon-renew />
    </button>
  </NavBar>
  <div v-if="!info?.transforms.length" flex="~ col gap-2 items-center justify-center" h-full>
    <div>No transform data for this module in the <Badge :text="payload.query.env" size="none" px1 py0.5 line-height-1em /> env</div>
    <button v-if="!isStaticMode" rounded bg-teal5 px2 py1 text-white @click="refetch(true)">
      Request the module
    </button>
  </div>
  <Container
    v-else-if="info && filteredTransforms"
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
              text="bailout" saturate-0
            />
            <Badge
              v-else-if="tr.noChange"
              text="no change"
              :color="20"
            />
            <Badge
              v-if="tr.load"
              text="load"
            />
            <Badge
              v-if="tr.order && tr.order !== 'normal'"
              :title="tr.order.includes('-') ? `Using object hooks ${tr.order}` : tr.order"
              :text="tr.order"
            />
            <Badge
              v-if="tr.error"
              text="error"
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
