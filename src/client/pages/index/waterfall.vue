<script setup lang="ts">
import { inspectSSR, onRefetch, root } from '../../logic'
import { getHot } from '../../logic/hot'
import { rpc } from '../../logic/rpc'

const data = ref(await rpc.getWaterfallInfo(inspectSSR.value))
const durationData = computed(() => Object.fromEntries(Object.entries(data.value).map(
  ([id, transforms]) => [id, {
    start: Math.min(...transforms.map(i => i.start), ...transforms.map(i => i.end)),
    end: Math.max(...transforms.map(i => i.start), ...transforms.map(i => i.end)),
  }],
)))
const startTime = computed(() => Math.min(...Object.values(durationData.value).map(i => i.start)))
const endTime = computed(() => Math.max(...Object.values(durationData.value).map(i => i.end)))
const scale = ref(0.3)
const tickFreq = computed(() => 1000)
const tickNum = computed(() => Math.ceil((endTime.value - startTime.value) / tickFreq.value) + 1)

const searchText = ref('')
const searchFn = computed(() => {
  const text = searchText.value.trim()
  if (text === '') {
    return () => true
  }
  const regex = new RegExp(text, 'i')
  return (name: string) => regex.test(name)
})

const waterfallData = computed(() => {
  const result: {
    isGroup?: boolean
    fade: boolean
    start: number
    end: number
    id: string
    name: string
  }[][] = []
  const rowsEnd: number[] = []
  for (const [id, transforms] of Object.entries(data.value)) {
    const sorted = [...transforms]
      .sort((a, b) => a.start - b.start)
      .filter(({ start, end }) => start + 2 < end)
    if (sorted.length === 0) {
      continue
    }
    const start = sorted[0].start
    const end = sorted[sorted.length - 1].end
    const spans = sorted.map(v => ({ ...v, id, fade: !searchFn.value(v.name) && !searchFn.value(id) }))
    const groupSpan = {
      isGroup: true,
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

onRefetch.on(async () => {
  await refetch()
})

watch(inspectSSR, refetch)

getHot().then((hot) => {
  if (hot) {
    hot.on('vite-plugin-inspect:update', refetch)
  }
})

function getPositionStyle(start: number, end: number) {
  return {
    left: `${(start - startTime.value) * scale.value}px`,
    width: `${(end - start) * scale.value}px`,
  }
}
</script>

<template>
  <NavBar>
    <RouterLink class="my-auto icon-btn !outline-none" to="/">
      <div i-carbon-arrow-left />
    </RouterLink>
    <div my-auto text-sm font-mono>
      Waterfall
    </div>
    <input v-model="searchText" placeholder="Search here..." class="w-full px-4 py-2 text-xs">

    <button text-lg icon-btn title="Inspect SSR" @click="inspectSSR = !inspectSSR">
      <div i-carbon-cloud-services :class="inspectSSR ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Zoom in" @click="scale += 0.1">
      <div i-carbon-zoom-in />
    </button>
    <button text-lg icon-btn title="Zoom in" :disabled="scale <= 0.11" @click="scale -= 0.1">
      <div i-carbon-zoom-out />
    </button>
    <div flex-auto />
  </NavBar>
  <Container v-if="data" of-auto>
    <div relative m-4 w-full flex flex-col gap-1 pb-2 pt-8>
      <div absolute top-0 h-full flex>
        <div w-10 overflow-hidden text-nowrap text-xs />
        <div relative flex-grow>
          <div v-for="i in tickNum" :key="i" absolute h-full bg-red-200 bg-op-40 :style="{ left: `${tickFreq * (i - 1) * scale}px`, width: '1px' }">
            <span absolute top--1 w-max> {{ i - 1 }} s </span>
          </div>
        </div>
      </div>
      <div v-for="spans, i in waterfallData" :key="i" h-5 flex>
        <div w-10 overflow-hidden text-nowrap text-xs>
          {{ i }}
        </div>
        <div relative flex-grow>
          <div v-for="{ isGroup, fade, start, end, id, name }, j in spans" :key="j" :title="`${name} - ${id}`" :class="(isGroup ? 'outline-orange-200 outline-offset-1 pointer-events-none' : 'outline-blue-200 outline-offset--1 bg-gray-500 bg-op-80') + (fade ? ' op-20 bg-op-20' : '')" :style="getPositionStyle(start, end)" absolute h-full flex items-center overflow-hidden text-nowrap outline-1 outline-solid>
            <template v-if="!isGroup">
              {{ name }} -
              <template v-if="id.startsWith(root)">
                <span class="op50">.</span>
                <span>{{ id.slice(root.length) }}</span>
              </template>
              <span v-else>{{ id }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Container>
</template>
