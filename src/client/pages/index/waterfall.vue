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

const { height } = useElementSize(container)

const data = shallowRef(await rpc.getWaterfallInfo(payload.query))
const startTime = computed(() => Math.min(...Object.values(data.value).map(i => i[0]?.start ?? Infinity)))
const endTime = computed(() => Math.max(...Object.values(data.value).map(i => i[i.length - 1]?.end ?? -Infinity)) + 1000)

async function refetch() {
  data.value = await rpc.getWaterfallInfo(payload.query)
}

onModuleUpdated.on(refetch)

watch(
  () => payload.query,
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

const itemFilter = ref('')
const idFilter = ref('')
const itemFilterFn = computed(() => createFilter(itemFilter.value))
const idFilterFn = computed(() => createFilter(idFilter.value))

const categories = computed(() => {
  return Object.entries(data.value)
    .filter(([k]) => idFilterFn.value(k))
    .sort(([_, a], [__, b]) => {
      const aStart = a[0]?.start ?? 0
      const bStart = b[0]?.start ?? 0
      return bStart - aStart
    })
})

const chartData = computed(() => {
  const result: any[] = []
  for (const [index, [id, steps]] of categories.value.entries()) {
    for (const s of steps) {
      if (itemFilterFn.value(s.name)) {
        result.push({
          name: id,
          value: [index, s.start, (s.end - s.start) < 1 ? 1 : s.end, s.end - s.start],
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

function renderItem(params: CustomSeriesRenderItemParams | any, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn {
  const categoryIndex = api.value(0)
  const start = api.coord([api.value(1), categoryIndex])
  const end = api.coord([api.value(2), categoryIndex])
  const height = (api.size?.([0, 1]) as number[])[1] * 0.6
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
      return `${params.marker + params.name}: ${params.value[3] <= 1 ? '<1' : params.value[3]}ms}`
    },
  },
  legendData: {
    top: 'center',
    data: ['c'],
  },
  title: {
    text: 'Waterfall',
    // left: 'center',
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
    data: categories.value.map(([id]) => id),
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
      data: chartData.value,
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
    <input v-model="itemFilter" placeholder="Item Filter..." class="w-full px-4 py-2 text-xs">

    <input v-model="idFilter" placeholder="ID Filter..." class="w-full px-4 py-2 text-xs">

    <QuerySelector />

    <button text-lg icon-btn title="Show resolveId" @click="options.view.waterfallShowResolveId = !options.view.waterfallShowResolveId">
      <span i-carbon-connect-source :class="options.view.waterfallShowResolveId ? 'opacity-100' : 'opacity-25'" />
    </button>

    <div flex-auto />
  </NavBar>

  <div ref="container" h-full p4>
    <div v-if="!chartData.length" flex="~" h-40 w-full>
      <div ma italic op50>
        No data
      </div>
    </div>
    <VChart class="w-100%" :style="chartStyle" :option="chartOption" autoresize />
  </div>
</template>
