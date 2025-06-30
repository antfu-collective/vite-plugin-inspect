<script setup lang="ts">
import type { init } from 'echarts/core'
import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn, TopLevelFormatterParams } from 'echarts/types/dist/shared'
import { BarChart, CustomChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { graphic, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { createFilter, generatorHashColorByString } from '../../node/utils'
import { getHot } from '../logic/hot'
import { onModuleUpdated, rpc } from '../logic/rpc'
import { useOptionsStore } from '../stores/options'
import { usePayloadStore } from '../stores/payload'

// 接收时间范围属性
const props = defineProps<{
  timeRange?: {
    type: string
    file: string
    timestamp: number
    nextTimestamp: number
    relativeTimestamp: number
    relativeNextTimestamp: number
    data: any[]
  } | null
}>()

use([
  VisualMapComponent,
  CanvasRenderer,
  BarChart,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  CustomChart,
])

const options = useOptionsStore()
const payload = usePayloadStore()

const container = ref<HTMLDivElement | null>()

const dataZoomBar = 130
const zoomBarOffset = 100

const { height } = useElementSize(container)

const data = shallowRef(await rpc.getWaterfallInfo(payload.query))
const hmrEvents = shallowRef(await rpc.getHmrEvents(payload.query))
const startTime = computed(() => {
  if (props.timeRange) {
    return props.timeRange.timestamp
  }

  return Math.min(...Object.values(data.value).map(i => i[0]?.start ?? Infinity))
})

const endTime = computed(() => {
  if (props.timeRange) {
    return props.timeRange.nextTimestamp
  }

  return Math.max(...Object.values(data.value).map(i => i[i.length - 1]?.end ?? -Infinity)) + 1000
})

const paused = ref(false)
const pluginFilter = ref('')
const idFilter = ref('')
const pluginFilterFn = computed(() => createFilter(pluginFilter.value))
const idFilterFn = computed(() => createFilter(idFilter.value))

async function refetch() {
  if (!paused.value) {
    data.value = await rpc.getWaterfallInfo(payload.query)
    hmrEvents.value = await rpc.getHmrEvents(payload.query)
  }
}

onModuleUpdated.on(refetch)

watch(
  () => [paused.value, payload.query],
  () => refetch(),
  { deep: true },
)

getHot().then((hot) => {
  if (hot) {
    hot.on('vite-plugin-inspect:update', () => {
      refetch()
    })
  }
})

const sortedData = computed(() => {
  if (!props.timeRange) {
    return Object.entries(data.value)
      .sort(([_, a], [__, b]) => {
        const aStart = a[0]?.start ?? 0
        const bStart = b[0]?.start ?? 0
        return aStart - bStart
      })
  }

  // 如果有选中的时间范围，只显示该时间范围内的数据
  const { timestamp, nextTimestamp } = props.timeRange
  return Object.entries(data.value)
    .map(([id, steps]) => {
      // 过滤出在时间范围内的步骤
      const filteredSteps = steps.filter(step =>
        step.start >= timestamp && step.start <= nextTimestamp,
      )
      return [id, filteredSteps] as [string, typeof steps]
    })
    .filter(([_, steps]) => steps.length > 0) // 只保留有数据的模块
    .sort(([_, a], [__, b]) => {
      const aStart = a[0]?.start ?? 0
      const bStart = b[0]?.start ?? 0
      return aStart - bStart
    })
})

const moduleIds = computed(() => sortedData.value.filter(([k]) => idFilterFn.value(k)).reverse())

const chartDataById = computed(() => {
  const result: any[] = []
  for (const [index, [id, steps]] of moduleIds.value.entries()) {
    for (const s of steps) {
      if (pluginFilterFn.value(s.name)) {
        const duration = s.end - s.start
        result.push({
          name: id,
          value: [index, s.start, duration < 1 ? s.start + 1 : s.end, duration],
          itemStyle: {
            normal: {
              color: generatorHashColorByString(id),
            },
          },
        })
      }
    }
  }
  return result
})

interface WaterfallSpan {
  kind: 'resolve' | 'transform' | 'group'
  fade: boolean
  start: number
  end: number
  id: string
  name: string
}

const chartDataStacked = computed(() => {
  const rows: WaterfallSpan[][] = []
  const rowsEnd: number[] = []
  for (let [id, steps] of sortedData.value) {
    if (!options.view.waterfallShowResolveId) {
      steps = steps.filter(i => !i.isResolveId)
    }
    if (steps.length === 0) {
      continue
    }
    const start = steps[0].start
    const end = steps[steps.length - 1].end
    const spans: WaterfallSpan[] = steps.map(v => ({
      kind: v.isResolveId ? 'resolve' : 'transform',
      start: v.start,
      end: v.end,
      name: v.name,
      id,
      fade: !pluginFilterFn.value(v.name) && !idFilterFn.value(id),
    }))
    const row = rowsEnd.findIndex((rowEnd, i) => {
      if (rowEnd <= start) {
        rowsEnd[i] = end
        rows[i].push(...spans)
        return true
      }
      return false
    })
    if (row === -1) {
      rows.push(spans)
      rowsEnd.push(end)
    }
  }
  return rows.reverse().map((spans, index) => spans.map((s) => {
    const duration = s.end - s.start
    return {
      name: s.id,
      value: [index, s.start, duration < 1 ? s.start + 1 : s.end, duration],
      itemStyle: {
        normal: {
          color: generatorHashColorByString(s.id),
          opacity: s.fade ? 0.2 : 1,
        },
      },
    }
  }))
})

function renderItem(params: CustomSeriesRenderItemParams | any, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn {
  const index = api.value(0)
  const start = api.coord([api.value(1), index])
  const end = api.coord([api.value(2), index])
  const height = (api.size?.([0, 1]) as number[])[1]

  const rectShape = graphic.clipRectByRect(
    {
      x: start[0],
      y: start[1] - height / 2,
      width: end[0] - start[0],
      height,
    },
    {
      x: params.coordSys.x,
      y: params.coordSys.y,
      width: params.coordSys.width,
      height: params.coordSys.height,
    },
  )

  return (
    rectShape && {
      type: 'rect',
      transition: ['shape'],
      shape: rectShape,
      style: api.style(),
    }
  )
}

type ChartOption = ReturnType<ReturnType<typeof init>['getOption']>
const chartOption = computed<ChartOption>(() => ({
  tooltip: {
    formatter(params: TopLevelFormatterParams | any) {
      return `${params.marker}${params.name}: ${params.value[3] <= 1 ? '<1' : params.value[3]}ms}`
    },
  },
  legendData: {
    top: 'center',
    data: ['c'],
  },
  title: {
    text: props.timeRange ? `${props.timeRange.type} - ${props.timeRange.file}` : 'Waterfall Range',
  },
  visualMap: {
    type: 'piecewise',
    // show: false,
    orient: 'horizontal',
    left: 'center',
    bottom: 10,
    pieces: [

    ],
    seriesIndex: 1,
    dimension: 1,
  },
  dataZoom: [
    {
      type: 'slider',
      filterMode: 'weakFilter',
      showDataShadow: false,
      top: height.value - dataZoomBar,
      labelFormatter: '',
    },
    {
      type: 'inside',
      filterMode: 'weakFilter',
    },
  ],
  grid: {
    height: height.value - dataZoomBar - zoomBarOffset,
  },
  xAxis: {
    min: startTime.value,
    max: endTime.value,
    scale: true,
    axisLabel: {
      formatter(val: number) {
        return `${(val - startTime.value).toFixed(val % 1 ? 2 : 0)} ms`
      },
    },
  },
  yAxis: {
    data: options.view.waterfallStacking ? [...chartDataStacked.value.keys()].reverse() : moduleIds.value.map(([id]) => id),
  },
  series: [
    {
      type: 'custom',
      name: 'c',
      renderItem,
      itemStyle: {
        opacity: 0.8,
      },
      encode: {
        x: [1, 2],
        y: 0,
      },
      data: options.view.waterfallStacking ? chartDataStacked.value.flat() : chartDataById.value,
      markLine: {
        data: hmrEvents.value
          .filter(({ timestamp }) => {
            if (!props.timeRange)
              return true
            return timestamp >= props.timeRange.timestamp && timestamp <= props.timeRange.nextTimestamp
          })
          .map(({ type, file, timestamp }) => ({
            name: `${type} ${file}`,
            xAxis: timestamp,
          })),
        lineStyle: {
          color: '#f00',
        },
        symbol: ['none', 'none'],
      },
    },
  ],
}))

const chartStyle = computed(() => {
  return {
    height: `${height.value}px`,
  }
})
</script>

<template>
  <NavBar>
    <div my-auto text-sm font-mono>
      <span v-if="props.timeRange">{{ props.timeRange.type }} Range</span>
      <span v-else>Waterfall Range</span>
    </div>

    <div v-if="props.timeRange" my-auto text-xs op75>
      {{ ((props.timeRange.nextTimestamp - props.timeRange.timestamp) / 1000).toFixed(2) }}s duration
    </div>

    <input v-model="pluginFilter" placeholder="Filter..." class="w-full px-4 py-2 text-xs">

    <div flex-auto />

    <template #actions>
      <span class="my-auto icon-btn !outline-none">
        <div i-carbon-close />
      </span>
    </template>
  </NavBar>

  <div ref="container" h-full p4>
    <div v-if="!Object.keys(data).length" flex="~" h-40 w-full>
      <div ma italic op50>
        No data
      </div>
    </div>
    <VChart v-else class="w-100%" :style="chartStyle" :option="chartOption" autoresize />
  </div>
</template>
