<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { Pane, Splitpanes } from 'splitpanes'
import { enableDiff, inspectSSR, inspectSourcemaps, lineWrapping, onRefetch, safeJsonParse, showBailout, showOneColumn } from '../../logic'
import { rpc } from '../../logic/rpc'
import type { HMRData } from '../../../types'
import { getHot } from '../../logic/hot'

function getModuleId(fullPath?: string) {
  if (!fullPath)
    return undefined

  return new URL(fullPath, 'http://localhost').searchParams.get('id') || undefined
}

const route = useRoute()
const module = getModuleId(route.fullPath)
const id = computed(() => getModuleId(route.fullPath))
const data = ref(module ? await rpc.getIdInfo(module, inspectSSR.value) : undefined)
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
  transforms.value?.filter(tr => showBailout.value || tr.result),
)

async function refetch() {
  if (id.value)
    data.value = await rpc.getIdInfo(id.value, inspectSSR.value, true)
}

onRefetch.on(async () => {
  await refetch()
})

watch([id, inspectSSR], refetch)

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
    <ModuleId v-if="id" :id="id" module />
    <Badge
      v-if="inspectSSR"
      text="SSR"
    />
    <div flex-auto />

    <button text-lg icon-btn title="Inspect SSR" @click="inspectSSR = !inspectSSR">
      <span i-carbon-cloud-services :class="inspectSSR ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn :title="sourcemaps ? 'Inspect sourcemaps' : 'Sourcemap is not available'" :disabled="!sourcemaps" @click="inspectSourcemaps({ code: to, sourcemaps })">
      <span i-carbon-choropleth-map :class="sourcemaps ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Line Wrapping" @click="lineWrapping = !lineWrapping">
      <span i-carbon-text-wrap :class="lineWrapping ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Toggle one column" @click="showOneColumn = !showOneColumn">
      <span v-if="showOneColumn" i-carbon-side-panel-open />
      <span v-else i-carbon-side-panel-close />
    </button>
    <button class="text-lg icon-btn" title="Toggle Diff" @click="enableDiff = !enableDiff">
      <span i-carbon-compare :class="enableDiff ? 'opacity-100' : 'opacity-25'" />
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
          <span flex-auto text-center text-sm>{{ inspectSSR ? 'SSR ' : '' }}TRANSFORM STACK</span>
          <button class="icon-btn" title="Toggle bailout plugins" @click="showBailout = !showBailout">
            <span :class="showBailout ? 'opacity-100 i-carbon-view' : 'opacity-75 i-carbon-view-off'" />
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
                  ? 'op75 saturate-50'
                  : ''
            "
            @click="index = tr.index.toString()"
          >
            <span :class="currentIndex !== tr.index && (tr.noChange || !tr.result) ? '' : 'fw-600'">
              <PluginName :name="tr.name" />
            </span>
            <Badge
              v-if="!tr.result"
              text="bailout"
            />
            <Badge
              v-else-if="tr.noChange"
              text="no change"
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
            <span flex-auto />
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
            :one-column="showOneColumn || !!currentTransform?.error"
            :diff="enableDiff && !currentTransform?.error"
            :from="from" :to="to"
            h-unset
          />
        </div>
      </Pane>
    </Splitpanes>
  </Container>
</template>
