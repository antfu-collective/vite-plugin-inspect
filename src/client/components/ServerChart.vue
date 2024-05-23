<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
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
import { usePayloadStore } from '../stores/payload'

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const payload = usePayloadStore()
const metrics = ref(await rpc.getServerMetrics(payload.query))

function getMiddlewareTotalTime(m: { total: number }[]) {
  return m[m.length - 1].total
}

const middlewareYData = computed(() => {
  return Object.keys(metrics.value.middleware || {}).sort((a, b) => getMiddlewareTotalTime(metrics.value.middleware![a]) - getMiddlewareTotalTime(metrics.value.middleware![b])).slice(-50)
})

const middewareSeries = computed(() => {
  return (Array.from(middlewareYData.value.reduce((acc, m) => {
    metrics.value.middleware?.[m].forEach(({ name }) => acc.add(name))
    return acc
  }, new Set())) as string[]).sort((a, b) => a.localeCompare(b)).map(m => ({
    name: m,
    stack: 'time',
    type: 'bar',
    barWidth: 12,
    data: middlewareYData.value.map((url) => {
      const middleware = metrics.value.middleware![url].find(({ name }) => name === m)
      return middleware ? middleware.self : 0
    }),
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
  legend: {
    top: 10,
    textStyle: {
      color: foregroundColor.value,
    },
  },
  grid: {
    left: '4%',
    right: '2%',
    top: 60,
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
  } satisfies SingleAxisComponentOption,
}))

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

    yAxis,
    tooltip,

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
  <div class="h-full w-[calc(100vw-100px)] translate-x-0 transform overflow-auto border-none shadow-lg transition-transform duration-300 bg-main">
    <div p4>
      <div v-if="!middlewareYData.length" flex="~" h-40 w-full>
        <div ma italic op50>
          No middleware metric data
        </div>
      </div>

      <div v-if="middlewareYData.length" class="my-auto ml-8 text-sm font-mono">
        Metrics for top50 urls
      </div>
      <VChart v-if="middlewareYData.length" class="h-200 w-100%" :style="middlewareStyle" :option="middlewareOption" autoresize />
    </div>
  </div>
</template>
