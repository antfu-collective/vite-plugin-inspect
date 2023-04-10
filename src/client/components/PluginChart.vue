<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { defineProps, ref } from 'vue'
import { searchResults } from '../logic'

const props = defineProps<{ plugin: string; hook: 'transform' | 'resolveId'; exit: () => void }>()

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const sortedSearchResults = computed(() => {
  return searchResults.value.filter(({ plugins }) => {
    const plugin = plugins.find(({ name, ...hooks }) => name === props.plugin && hooks[props.hook])
    return plugin ? plugin[props.hook] : false
  }).sort((next, cur) => {
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

const option = ref({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
    formatter(params: any[]) {
      const { name, seriesName, value, marker } = params[0]
      return `${name}<br />${marker}${seriesName} (${value}ms)`
    },
  },
  grid: {
    left: '1%',
    right: '2%',
    top: '3%',
    bottom: '2%',
    containLabel: true,
  },
  xAxis: {
    type: 'value',
  },
  yAxis: {
    type: 'category',
    boundaryGap: [0, 0.01],
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: {
      color: '#374151',
      fontSize: 14,
      formatter(value: string) {
        return value.split('/').slice(-3).join('/')
      },
    },
    data: yData.value,
  },
  series: [
    {
      name: props.plugin,
      type: 'bar',
      barWidth: 12,
      colorBy: 'data',
      data: seriesData.value,
    },
  ],
})

const chartStyle = computed(() => {
  return {
    height: `${Math.max(sortedSearchResults.value.length * 24, 200)}px`,
  }
})
</script>

<template>
  <div class="bg-white dark:bg-[#111] border-none h-full pt-4 w-[calc(100vw-100px)] overflow-auto shadow-lg transition-transform transform duration-300 translate-x-0">
    <div class="h-32px flex flex-none gap-4 items-center pl-4">
      <a class="cursor-pointer" @click="props.exit()"><carbon-arrow-left /></a>{{ props.plugin }}
    </div>
    <VChart class="w-100%" :style="chartStyle" :option="option" autoresize />
  </div>
</template>
