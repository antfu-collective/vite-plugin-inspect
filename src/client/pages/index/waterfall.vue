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
import { Pane, Splitpanes } from 'splitpanes'
import VChart from 'vue-echarts'
import { createFilter, generatorHashColorByString } from '../../../node/utils'
import { getHot } from '../../logic/hot'
import { onModuleUpdated, rpc } from '../../logic/rpc'
import { useOptionsStore } from '../../stores/options'
import { usePayloadStore } from '../../stores/payload'

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

const dataZoomBar = 100
const zoomBarOffset = 100

// const { height } = useElementSize(container)
const height = ref(300)

// const currentIndex = ref('')

const data = shallowRef(await rpc.getWaterfallInfo(payload.query))
const hmrEvents = shallowRef(await rpc.getHmrEvents(payload.query))
const startTime = computed(() => Math.min(...Object.values(data.value).map(i => i[0]?.start ?? Infinity)))
const endTime = computed(() => Math.max(...Object.values(data.value).map(i => i[i.length - 1]?.end ?? -Infinity)) + 1000)

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

const dataGroupByTimeRange = computed(() => {
  const dataGroup = [] as {
    type: string
    file: string
    timestamp: number
    nextTimestamp: number
    relativeTimestamp: number
    relativeNextTimestamp: number
    data: {
      name: string
      start: number
      end: number
      isResolveId: boolean
      filePath: string
    }[]
  }[]

  // const dataPool = Object.entries(data.value).map(([filePath, steps]) => {
  //   return steps.map((step) => {
  //     return {
  //       filePath,
  //       ...step,
  //     }
  //   })
  // })

  const dataPool = Object.entries(data.value).reduce((acc, [filePath, steps]) => {
    const data = steps.map((step) => {
      return {
        filePath,
        relativeStart: step.start - startTime.value,
        relativeEnd: step.end - startTime.value,
        ...step,
      }
    })

    acc.push(...data)

    return acc
  }, [] as { name: string, start: number, end: number, isResolveId: boolean, filePath: string }[])

  hmrEvents.value.forEach((event) => {
    const { type, file, timestamp } = event

    const nextTimestamp = hmrEvents.value[hmrEvents.value.indexOf(event) + 1]?.timestamp ?? endTime.value

    const dataGroupItem = {
      type,
      file,
      timestamp,
      relativeTimestamp: timestamp - startTime.value,
      nextTimestamp,
      relativeNextTimestamp: nextTimestamp - startTime.value,
      data: [] as {
        name: string
        start: number
        end: number
        isResolveId: boolean

        filePath: string
      }[],
    }

    /**
     *
     * 每次保留变更值？
     *  1. 每次hmr 时间时，计算一份增量数据
     *
     * 还是按照时间去计算？
     *  1. 根据每次hmr的时间，来计算此次hmr 时间范围内的数据
     *
     * 最终采取方式二
     *
     *  方案：
     *  根据每次hmr的时间 即 timestamp 字段，计算从此次hmr时间到下次hmr时间之间的数据
     */

    dataPool.forEach((step) => {
      // 根据每次hmr的时间 即 timestamp 字段，计算从此次hmr时间到下次hmr时间之间的数据

      const hmrRange = [timestamp, hmrEvents.value[hmrEvents.value.indexOf(event) + 1]?.timestamp ?? endTime.value]

      // 如果当前数据的开始时间在 hmr 时间范围内
      if (step.start >= hmrRange[0] && step.start <= hmrRange[1]) {
        dataGroupItem.data.push(step)
      }
    })

    dataGroup.push(dataGroupItem)
  })

  // console.log('dataPool', dataPool)
  // console.log('dataGroup', dataGroup)

  dataGroup.unshift({
    type: 'init',
    file: 'init',
    timestamp: startTime.value,
    relativeTimestamp: 0,
    nextTimestamp: hmrEvents.value[0]?.timestamp ?? endTime.value,
    relativeNextTimestamp: hmrEvents.value[0]?.timestamp ?? endTime.value,
    data: dataPool.filter(step => step.start < hmrEvents.value[0]?.timestamp),
  })

  return dataGroup
})

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
  return Object.entries(data.value)
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
    text: 'Waterfall',
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
        data: hmrEvents.value.map(({ type, file, timestamp }) => ({
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
    <RouterLink class="my-auto icon-btn !outline-none" to="/">
      <div i-carbon-arrow-left />
    </RouterLink>
    <div my-auto text-sm font-mono>
      Waterfall
    </div>

    <input v-model="pluginFilter" placeholder="Plugin Filter..." class="w-full px-4 py-2 text-xs">
    <input v-model="idFilter" placeholder="ID Filter..." class="w-full px-4 py-2 text-xs">

    <QuerySelector />

    <button text-lg icon-btn title="Pause" @click="paused = !paused">
      <span v-if="!paused" i-carbon-pause opacity-90 :class="paused ? 'text-red' : ''" />
      <span v-else i-carbon-stop opacity-90 :class="paused ? 'text-red' : ''" />
    </button>
    <button text-lg icon-btn title="Show resolveId" @click="options.view.waterfallShowResolveId = !options.view.waterfallShowResolveId">
      <span i-carbon-connect-source :class="options.view.waterfallShowResolveId ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button text-lg icon-btn title="Stacked" @click="options.view.waterfallStacking = !options.view.waterfallStacking">
      <span i-carbon-stacked-scrolling-1 :class="options.view.waterfallStacking ? 'opacity-100' : 'opacity-25'" />
    </button>

    <div flex-auto />
  </NavBar>

  <div ref="container" p4>
    <div v-if="!Object.keys(data).length" flex="~" h-40 w-full>
      <div ma italic op50>
        No data
      </div>
    </div>
    <VChart v-else class="w-100%" :style="chartStyle" :option="chartOption" autoresize />
  </div>

  <Splitpanes h-full of-hidden border="t main" @resize="options.view.panelSizeModule = $event[0].size">
    <Pane
      :size="options.view.panelSizeModule" min-size="10"
      flex="~ col" border="r main"
      overflow-y-auto
    >
      <div flex="~ gap2 items-center" p2 tracking-widest class="op75 dark:op50">
        <span flex-auto text-center text-sm uppercase>{{ payload.query.env }} WATERFALL STACK</span>
        <button
          class="icon-btn" title="Toggle bailout plugins"
          @click="options.view.showBailout = !options.view.showBailout"
        >
          <div :class="options.view.showBailout ? 'opacity-100 i-carbon-view' : 'opacity-75 i-carbon-view-off'" />
        </button>
      </div>
      <div border="b main" />
      <template v-for="(group) of dataGroupByTimeRange" :key="group.relativeTimestamp">
        <button
          border="b main"
          flex="~ gap-1 wrap"
          items-center px-2 py-2 text-left text-xs font-mono
          class="bg-active"
          @click="group.file.toString()"
        >
          <span class="fw-600">
            <!-- <PluginName :name="group.name" /> -->
            {{ group.type }}
          </span>

          <Badge
            v-if="group.nextTimestamp"
            text="error"
          >
            <span flex-auto />
            <DurationDisplay :duration="group.nextTimestamp - group.timestamp" />
          </Badge>

          <!-- <Badge
            v-if="!group.result"
            text="bailout" saturate-0
          />
          <Badge
            v-else-if="group.noChange"
            text="no change"
            :color="20"
          />
          <Badge
            v-if="group.load"
            text="load"
          />
          <Badge
            v-if="group.order && group.order !== 'normal'"
            :title="group.order.includes('-') ? `Using object hooks ${group.order}` : group.order"
            :text="group.order"
          />
          <Badge
            v-if="group.error"
            text="error"
          >
            <span flex-auto />
            <DurationDisplay :duration="group.end - group.start" />
          </Badge> -->
        </button>
      </template>
    </Pane>

    <Pane min-size="5">
      <WaterfallChart />
    </Pane>
  </Splitpanes>

  <div>
    <pre>{{ JSON.stringify(dataGroupByTimeRange, null, 2) }}</pre>
  </div>
</template>
