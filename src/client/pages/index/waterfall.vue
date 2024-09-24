<script setup lang="ts">
import { graphic, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { CustomSeriesOption } from 'echarts/charts'
import { BarChart, CustomChart } from 'echarts/charts'
import type {
  SingleAxisComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn, LegendComponentOption, TopLevelFormatterParams } from 'echarts/types/dist/shared'
import { rpc } from '../../logic/rpc'
import { getHot } from '../../logic/hot'
import { inspectSSR, onRefetch, waterfallShowResolveId } from '../../logic'

const container = ref<HTMLDivElement | null>()

const dataZoomBar = 100
const zoomBarOffset = 100

const { height } = useElementSize(container)

const data = shallowRef(await rpc.getWaterfallInfo(inspectSSR.value))
const startTime = computed(() => Math.min(...Object.values(data.value).map(i => i[0]?.start ?? Infinity)))
const endTime = computed(() => Math.max(...Object.values(data.value).map(i => i[i.length - 1]?.end ?? -Infinity)) + 1000)

// const reversed = ref(false)
// const searchText = ref('')
// const searchFn = computed(() => {
//   const text = searchText.value.trim()
//   if (text === '') {
//     return () => true
//   }
//   const regex = new RegExp(text, 'i')
//   return (name: string) => regex.test(name)
// })

const searchItem = ref('')
const searchId = ref('')

const searchItemFn = computed(() => {
  const text = searchItem.value.trim()
  if (text === '') {
    return () => true
  }
  const regex = new RegExp(text, 'i')
  return (name: string) => regex.test(name)
})

const searchIdFn = computed(() => {
  const text = searchId.value.trim()
  if (text === '') {
    return () => true
  }
  const regex = new RegExp(text, 'i')
  return (name: string) => regex.test(name)
})

const categories = computed(() => {
  const cates = Object.keys(data.value).filter(searchIdFn.value)

  // 按照start时间给key排序
  cates.sort((a, b) => {
    const aStart = data.value[a][0]?.start ?? Infinity
    const bStart = data.value[b][0]?.start ?? Infinity
    return bStart - aStart
  })

  return cates
})

// const legendData = computed(() => {
//   const l = categories.value.map((id) => {
//     return {
//       name: id,
//       icon: 'circle',
//     }
//   })

//   console.log(l)

//   return l
// })

function generatorHashColorByString(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  let color = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF
    color += (`00${value.toString(16)}`).substr(-2)
  }
  return color
}

const types = computed(() => {
  return Object.keys(data.value).map((id) => {
    return {
      name: id,
      color: generatorHashColorByString(id),
    }
  })
})

const waterfallData = computed(() => {
  const result: any = []

  const sorted = Object.entries(data.value).sort(([a], [b]) => {
    const aStart = data.value[a][0]?.start ?? Infinity
    const bStart = data.value[b][0]?.start ?? Infinity
    return bStart - aStart
  })

  sorted.forEach(([id, steps], index) => {
    steps.forEach((s) => {
      const typeItem = types.value.find(i => i.name === id)

      const duration = s.end - s.start

      if (searchItemFn.value(s.name)) {
        result.push({
          name: typeItem ? typeItem.name : id,
          value: [index, s.start, (s.end - s.start) < 1 ? 1 : s.end, duration],
          itemStyle: {
            normal: {
              color: typeItem ? typeItem.color : '#000',
            },
          },
        })
      }
    })
  })

  // result.sort((a, b) => {
  //   return b.value[1] - a.value[1]
  // })

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

const option = computed(() => ({
  tooltip: {
    formatter(params: TopLevelFormatterParams | any) {
      return `${params.marker + params.name}: ${params.value[3] <= 1 ? '<1' : params.value[3]}ms}`
    },

  } satisfies TooltipComponentOption,
  legendData: {
    top: 'center',
    data: ['c'],
  } satisfies LegendComponentOption,

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
    // 最多支持放大到1ms

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
    // type: 'value',

    scale: true,
    axisLabel: {
      formatter(val: number) {
        return `${(val - startTime.value).toFixed(val % 1 ? 2 : 0)} ms`
      },
    },
  } satisfies SingleAxisComponentOption,
  yAxis: {
    data: categories.value,
  } satisfies SingleAxisComponentOption,
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
      data: waterfallData.value,
    },
  ] satisfies CustomSeriesOption[],

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
    <input v-model="searchItem" placeholder="Item Filter..." class="w-full px-4 py-2 text-xs">

    <input v-model="searchId" placeholder="ID Filter..." class="w-full px-4 py-2 text-xs">

    <button text-lg icon-btn title="Inspect SSR" @click="inspectSSR = !inspectSSR">
      <div i-carbon-cloud-services :class="inspectSSR ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button class="text-lg icon-btn" title="Show resolveId" @click="waterfallShowResolveId = !waterfallShowResolveId">
      <div i-carbon-connect-source :class="waterfallShowResolveId ? 'opacity-100' : 'opacity-25'" />
    </button>

    <!-- <button class="text-lg icon-btn" title="Show resolveId" @click="reversed = !reversed">
      <div i-carbon-arrows-vertical :class="reversed ? 'opacity-100' : 'opacity-25'" />
    </button> -->
    <div flex-auto />
  </NavBar>

  <div ref="container" h-full p4>
    <div v-if="!waterfallData.length" flex="~" h-40 w-full>
      <div ma italic op50>
        No data
      </div>
    </div>
    <VChart class="w-100%" :style="chartStyle" :option="option" autoresize />
  </div>
</template>
