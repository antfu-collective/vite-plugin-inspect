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
const sortedBaseMetrics = computed(() => {
  // @ts-expect-error m is data.value's key
  return baseMetrics.filter(m => data.value[m] !== undefined).sort((a, b) => data.value[a] - data.value[b]) as typeof baseMetrics
})

const baseYData = computed(() => {
  return (sortedBaseMetrics.value.map(key => ({
    prebundle: 'pre-bundle',
    scan: 'scan dependency',
    startUp: 'server start up',
    initTsconfck: 'init tsconfck',
    loadConfig: 'load config',
  })[key]!))
})

const baseSeriesData = computed(() => {
   // @ts-expect-error m is data.value's key
  return sortedBaseMetrics.value.map(m => data.value[m]!)
})

const middlewares = computed(() => {
  return (Array.from(Object.values(data.value.middleware || {}).reduce((acc, m) => {
    Object.keys(m).forEach(name => acc.add(name))
    return acc
  }, new Set())) as string[]).sort((a, b) => a.localeCompare(b))
})

function getMiddlewareTotalTime(m: Record<string, number>) {
  return Object.keys(m).reduce((total, name) => total + m[name], 0)
}

const middlewareYData = computed(() => {
  return Object.keys(data.value.middleware || {}).sort((a, b) => getMiddlewareTotalTime(data.value.middleware![a]) - getMiddlewareTotalTime(data.value.middleware![b])).slice(-50)
})

const middewareSeries = computed(() => {
  return middlewares.value.map(m => ({
    name: m,
    stack: 'time',
    type: 'bar',
    barWidth: 12,
    data: middlewareYData.value.map(url => data.value.middleware![url][m] ?? 0),
  }))
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
      formatter(value: any) {
        return value.split('/').slice(-3).join('/')
      },
    },
  } satisfies SingleAxisComponentOption,
}))

const serverOption = computed(() => {
  const tooltip = {
    ...baseOption.value.tooltip,
    formatter(params: any) {
      const { name, value, marker } = params[0]
      return `${marker}${name} (${value}ms)`
    },
  }

  const yAxis = { ...baseOption.value.yAxis, data: baseYData.value }

  const series = [
    {
      type: 'bar',
      barWidth: 12,
      colorBy: 'data',
      data: baseSeriesData.value,
    },
  ] satisfies BarSeriesOption[]

  return {
    ...baseOption.value,
    yAxis,
    tooltip,
    grid: {
      left: '1%',
      right: '2%',
      top: '10%',
      bottom: '2%',
      containLabel: true,
    },
    series,
  }
})

const middlewareOption = computed(() => {
  const tooltip = {
    ...baseOption.value.tooltip,
    formatter(params: any[]) {
      return [params[0].name, ...params.map(({ marker, seriesName, value }) => `${marker}${seriesName} (${value}ms)`)].join('<br/>')
    },
  }

  const yAxis = { ...baseOption.value.yAxis, data: middlewareYData.value }

  return {
    ...baseOption.value,
    legend: {
      top: 10,
    },
    yAxis,
    tooltip,
    grid: {
      left: '4%',
      right: '2%',
      top: 60,
      bottom: '2%',
      containLabel: true,
    },
    series: middewareSeries.value,
  }
})

const middlewareStyle = computed(() => {
  return {
    height: `${Math.max(middlewareYData.value.length * 28, 200)}px`,
  }
})
</script>

<template>
  <div class="bg-white dark:bg-[#111] border-none h-full w-[calc(100vw-100px)] overflow-auto shadow-lg transition-transform transform duration-300 translate-x-0">
    <div p4>
      <div v-if="!baseYData.length" flex="~" w-full h-40>
        <div ma op50 italic>
          No overview data
        </div>
      </div>

      <div class="text-sm font-mono my-auto">
        Metrics for server
      </div>
      <VChart class="w-100% h-60" :option="serverOption" autoresize />

      <div v-if="middlewareYData.length" class="text-sm font-mono my-auto mt-10">
        Metrics for middleware(top50)
      </div>
      <VChart v-if="middlewareYData.length" class="w-100% h-200" :style="middlewareStyle" :option="middlewareOption" autoresize />
    </div>
  </div>
</template>
