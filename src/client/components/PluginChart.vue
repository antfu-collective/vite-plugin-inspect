<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { BarSeriesOption } from 'echarts/charts'
import { BarChart } from 'echarts/charts'
import type {
  SingleAxisComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { defineProps } from 'vue'
import { isDark, searchResults } from '../logic'

const props = defineProps<{
  plugin: string
  hook: 'transform' | 'resolveId'
  exit: () => void
}>()

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const sortedSearchResults = computed(() => {
  return searchResults.value
    .filter(({ plugins }) => {
      const plugin = plugins.find(({ name, ...hooks }) => name === props.plugin && hooks[props.hook])
      return plugin ? plugin[props.hook] : false
    })
    .sort((next, cur) => {
      const nextTime = next.plugins.find(({ name }) => name === props.plugin)![props.hook]!
      const curTime = cur.plugins.find(({ name }) => name === props.plugin)![props.hook]!
      return nextTime - curTime
    })
})

const yData = computed(() => {
  return sortedSearchResults.value.map(({ id }) => id)
})

const seriesData = computed(() => {
  return sortedSearchResults.value.map(({ plugins }) => {
    const hookTime = plugins.find(({ name, ...hooks }) => name === props.plugin && hooks[props.hook])![props.hook]!
    return {
      itemStyle: { color: hookTime > 50 ? 'rgba(255, 0, 0, 400)' : hookTime > 20 ? '#faee58' : '#91cc75' },
      value: hookTime,
    }
  })
})

const foregroundColor = computed(() => (isDark.value ? '#fff' : '#111'))
const backgroundColor = computed(() => (isDark.value ? '#111' : '#fff'))
const borderColor = computed(() => '#8888')

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
    borderColor: borderColor.value,
    backgroundColor: backgroundColor.value,
    textStyle: {
      color: foregroundColor.value,
    },
    formatter(params: any) {
      const { name, seriesName, value, marker } = params[0]
      return `${name}<br />${marker}${seriesName} (${value}ms)`
    },
  } satisfies TooltipComponentOption,
  grid: {
    left: '1%',
    right: '2%',
    top: '3%',
    bottom: '2%',
    containLabel: true,
  },
  xAxis: {
    type: 'value',
    minInterval: 10,
    splitLine: {
      lineStyle: {
        color: borderColor.value,
      },
    },
    axisLine: {
      lineStyle: {
        color: borderColor.value,
      },
    },
  } satisfies SingleAxisComponentOption,
  yAxis: {
    type: 'category',
    axisTick: { show: false },
    axisLine: {
      show: false,
      lineStyle: {
        opacity: 0.5,
        color: borderColor.value,
      },
    },
    axisLabel: {
      color: foregroundColor.value,
      fontSize: 12,
      formatter(value: any) {
        return value.split('/').slice(-3).join('/')
      },
    },
    data: yData.value,
  } satisfies SingleAxisComponentOption,
  series: [
    {
      name: props.plugin,
      type: 'bar',
      barWidth: 12,
      colorBy: 'data',
      data: seriesData.value,
    },
  ] satisfies BarSeriesOption[],
}))

const chartStyle = computed(() => {
  return {
    height: `${Math.max(sortedSearchResults.value.length * 24, 200)}px`,
  }
})
</script>

<template>
  <div class="bg-white dark:bg-[#111] border-none h-full w-[calc(100vw-100px)] overflow-auto shadow-lg transition-transform transform duration-300 translate-x-0">
    <NavBar>
      <a class="icon-btn !outline-none my-auto" @click="props.exit()">
        <carbon-chevron-left />
      </a>
      <div class="text-sm font-mono my-auto">
        Metrics for {{ props.plugin }}
      </div>
      <template #actions>
        <div />
      </template>
    </NavBar>

    <div p4>
      <div v-if="!yData.length" flex="~" w-full h-40>
        <div ma op50 italic>
          No data for this plugin
        </div>
      </div>
      <VChart class="w-100%" :style="chartStyle" :option="option" autoresize />
    </div>
  </div>
</template>
