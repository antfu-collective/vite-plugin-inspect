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
import { isDark, rpc } from '../logic'

// const props = defineProps<{
//   plugin: string
//   hook: 'transform' | 'resolveId'
//   exit: () => void
// }>()

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const data = ref(await rpc.getServerMetrics())
const baseMetrics = ['prebundle', 'scan', 'startUp', 'initTsconfck', 'loadConfig']
const sortedMetrics = computed(() => {
  // @ts-expect-error a,b are data's keys
  return baseMetrics.sort((a, b) => data.value[a] - data.value[b]) as typeof baseMetrics
})

const yData = computed(() => {
  return (sortedMetrics.value.map(key => ({
    prebundle: 'pre-bundle',
    scan: 'scan dependency',
    startUp: 'server start up',
    initTsconfck: 'init tsconfck',
    loadConfig: 'load config',
  })[key]!))
})

const seriesData = computed(() => {
  // @ts-expect-error key is data's key
  return sortedMetrics.value.map(key => data.value[key]!)
})

const foregroundColor = computed(() => (isDark.value ? '#fff' : '#111'))
const backgroundColor = computed(() => (isDark.value ? '#111' : '#fff'))
const borderColor = computed(() => '#8888')

const baseOption = computed(() => ({
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
  } satisfies TooltipComponentOption,
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
    },
    data: yData.value,
  } satisfies SingleAxisComponentOption,
  series: [
    {
      type: 'bar',
      barWidth: 12,
      colorBy: 'data',
      data: seriesData.value,
    },
  ] satisfies BarSeriesOption[],
}))

const serverOption = computed(() => {
  const tooltip = {
    ...baseOption.value.tooltip,
    formatter(params: any) {
      const { name, value, marker } = params[0]
      return `${marker}${name} (${value}ms)`
    },
  }

  return {
    ...baseOption.value,
    tooltip,
    grid: {
      left: '1%',
      right: '2%',
      top: '10%',
      bottom: '2%',
      containLabel: true,
    },
  }
})

const chartStyle = computed(() => {
  return {
    height: `${Math.max(200)}px`,
  }
})
</script>

<template>
  <div class="bg-white dark:bg-[#111] border-none h-full w-[calc(100vw-100px)] overflow-auto shadow-lg transition-transform transform duration-300 translate-x-0">
    <div p4>
      <div v-if="!yData.length" flex="~" w-full h-40>
        <div ma op50 italic>
          No overview data
        </div>
      </div>

      <div class="text-sm font-mono my-auto">
        Metrics for ViteServer
      </div>
      <VChart class="w-100% h-60" :option="serverOption" autoresize />
    </div>
  </div>
</template>
