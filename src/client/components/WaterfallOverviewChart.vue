<script setup lang="ts">
import type { init } from 'echarts/core'
import VChart from 'vue-echarts'

type ChartOption = ReturnType<ReturnType<typeof init>['getOption']>

interface Props {
  data: Record<string, any>
  chartStyle: Record<string, any>
  chartOption: ChartOption
}

defineProps<Props>()

const container = ref<HTMLDivElement | null>()
</script>

<template>
  <div ref="container" p4>
    <div v-if="!Object.keys(data).length" flex="~" h-40 w-full>
      <div ma italic op50>
        No data
      </div>
    </div>
    <VChart v-else class="w-100%" :style="chartStyle" :option="chartOption" autoresize />
  </div>
</template>
