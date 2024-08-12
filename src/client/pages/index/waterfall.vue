<script setup lang="ts">
import { range } from '@antfu/utils'
import { inspectSSR, onRefetch, root, waterfallShowResolveId } from '../../logic'
import { getHot } from '../../logic/hot'
import { rpc } from '../../logic/rpc'

const data = shallowRef(await rpc.getWaterfallInfo(inspectSSR.value))
const startTime = computed(() => Math.min(...Object.values(data.value).map(i => i[0]?.start ?? Infinity)))
const endTime = computed(() => Math.max(...Object.values(data.value).map(i => i[i.length - 1]?.end ?? -Infinity)) + 1000)
const scale = ref(0.3)

const searchText = ref('')
const searchFn = computed(() => {
  const text = searchText.value.trim()
  if (text === '') {
    return () => true
  }
  const regex = new RegExp(text, 'i')
  return (name: string) => regex.test(name)
})

const container = ref<HTMLElement>()
const { x: containerScrollX } = useScroll(container)
const { width: containerWidth } = useElementSize(container)
const visibleMin = computed(() => (containerScrollX.value - 500) / scale.value)
const visibleMax = computed(() => (containerScrollX.value + containerWidth.value + 500) / scale.value)
const tickNum = computed(() => range(
  Math.floor(Math.max(0, visibleMin.value) / 1000),
  Math.ceil(Math.min(endTime.value - startTime.value, visibleMax.value) / 1000),
))

interface WaterfallSpan {
  kind: keyof typeof classNames
  fade: boolean
  start: number
  end: number
  id: string
  name: string
}

const waterfallData = computed(() => {
  const result: WaterfallSpan[][] = []
  const rowsEnd: number[] = []
  for (let [id, steps] of Object.entries(data.value)) {
    if (!waterfallShowResolveId.value) {
      steps = steps.filter(i => !i.isResolveId)
    }
    if (steps.length === 0) {
      continue
    }
    const start = steps[0].start - startTime.value
    const end = steps[steps.length - 1].end - startTime.value
    const spans: WaterfallSpan[] = steps.map(v => ({
      kind: v.isResolveId ? 'resolve' : 'transform',
      start: v.start - startTime.value,
      end: v.end - startTime.value,
      name: v.name,
      id,
      fade: !searchFn.value(v.name) && !searchFn.value(id),
    }))
    const groupSpan: WaterfallSpan = {
      kind: 'group',
      fade: spans.every(i => i.fade),
      start,
      end,
      id,
      name: 'group',
    }
    spans.push(groupSpan)
    const row = rowsEnd.findIndex((rowEnd, i) => {
      if (rowEnd <= start) {
        rowsEnd[i] = end
        result[i].push(...spans)
        return true
      }
      return false
    })
    if (row === -1) {
      result.push(spans)
      rowsEnd.push(end)
    }
  }
  return result
})

async function refetch() {
  data.value = await rpc.getWaterfallInfo(inspectSSR.value)
}

onRefetch.on(refetch)
watch(inspectSSR, refetch)

getHot().then((hot) => {
  if (hot) {
    hot.on('vite-plugin-inspect:update', refetch)
  }
})

function getPositionStyle(start: number, end: number) {
  return {
    left: `${start * scale.value}px`,
    width: `${Math.max((end - start) * scale.value, 1)}px`,
  }
}

const classNames = {
  resolve: 'outline-red-200 outline-offset--1 bg-gray-300 dark:bg-gray-500 bg-op-80 z-1',
  transform: 'outline-blue-200 outline-offset--1 bg-gray-300 dark:bg-gray-500 bg-op-80 z-1',
  group: 'outline-orange-700 dark:outline-orange-200',
}

watch(scale, (newScale, oldScale) => {
  containerScrollX.value *= newScale / oldScale
})
</script>

<template>
  <NavBar>
    <RouterLink class="my-auto icon-btn !outline-none" to="/">
      <div i-carbon-arrow-left />
    </RouterLink>
    <div my-auto text-sm font-mono>
      Waterfall
    </div>
    <input v-model="searchText" placeholder="Search..." class="w-full px-4 py-2 text-xs">

    <button text-lg icon-btn title="Inspect SSR" @click="inspectSSR = !inspectSSR">
      <div i-carbon-cloud-services :class="inspectSSR ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button class="text-lg icon-btn" title="Show resolveId" @click="waterfallShowResolveId = !waterfallShowResolveId">
      <div i-carbon-connect-source :class="waterfallShowResolveId ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Zoom in" @click="scale += 0.1">
      <div i-carbon-zoom-in />
    </button>
    <button text-lg icon-btn title="Zoom in" :disabled="scale <= 0.11" @click="scale -= 0.1">
      <div i-carbon-zoom-out />
    </button>
    <div flex-auto />
  </NavBar>
  <Container of-auto @element="el => container = el">
    <div relative m-4 w-full flex flex-col gap-1 pb-2 pt-8>
      <div absolute left-8 top-0 h-full w-0 of-x-visible>
        <div v-for="i in tickNum" :key="i" absolute h-full bg-gray-400 bg-op-30 :style="{ left: `${1000 * i * scale - 2}px`, width: '2px' }">
          <span absolute left-1 top--1 w-max op-80>
            {{ i }}
            <span op-70>s</span>
          </span>
        </div>
      </div>
      <div v-for="spans, i in waterfallData" :key="i" h-5 flex>
        <div w-8 overflow-hidden pr-4 text-right text-nowrap text-xs tabular-nums>
          {{ i }}
        </div>
        <div absolute h-full :style="getPositionStyle(0, endTime - startTime)" />
        <div relative flex-grow>
          <template v-for="{ kind, fade, start, end, id, name }, j in spans" :key="j">
            <div
              v-if="visibleMin <= end && start <= visibleMax"
              :title="`${kind === 'group' ? '' : `${kind === 'resolve' ? '(resolve)' : ''} ${name} - `}${id} (${start}+${end - start}ms)`"
              :class="(classNames[kind]) + (fade ? ' op-20 bg-op-20' : '')"
              :style="getPositionStyle(start, end)"
              absolute h-full flex items-center overflow-hidden pl-1 text-nowrap font-mono outline-1 outline-solid
            >
              <template v-if="kind !== 'group'">
                <PluginName :name />
                <span mx-.5 op-50>-</span>
                <template v-if="id.startsWith(root)">
                  <span class="op50">.</span>
                  <span>{{ id.slice(root.length) }}</span>
                </template>
                <span v-else>{{ id }}</span>
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Container>
</template>
