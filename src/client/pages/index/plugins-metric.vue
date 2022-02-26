<script setup lang="ts">
import type { PluginMetricInfo } from '../../../types'
import { onRefetch } from '../../logic'

const { data, execute } = useFetch(computed(() => '/__inspect_api/plugins-metric'), { immediate: true })
  .get()
  .json<{ metrics: PluginMetricInfo[] }>()

const plugins = computed(
  () => data.value?.metrics ?? [],
)

function getLatencyColor(latency: number) {
  if (latency > 1000)
    return 'text-red-400'
  if (latency > 500)
    return 'text-orange-400'
  if (latency > 200)
    return 'text-yellow-400'
  return ''
}

onRefetch.on(async() => {
  await execute()
})
</script>

<template>
  <NavBar>
    <router-link class="icon-btn !outline-none my-auto" to="/">
      <carbon-arrow-left />
    </router-link>
    <div class="text-sm font-mono my-auto">
      Plugins Metrics
    </div>
    <div class="flex-auto" />
  </NavBar>
  <Container v-if="data" class="overflow-auto">
    <div class="mb-4 grid grid-cols-[1fr,max-content,max-content,max-content,max-content,max-content,1fr] mt-2 whitespace-nowrap text-sm font-mono children:(px-4 py-2 border-b border-main align-middle)">
      <div />
      <div class="font-bold text-xs">
        Plugin Name
      </div>
      <div class="font-bold text-xs text-center">
        Enforce
      </div>
      <div class="font-bold text-xs text-right">
        Passes
      </div>

      <div class="font-bold text-xs text-right">
        Average Time
      </div>
      <div class="font-bold text-xs text-right">
        Total Time
      </div>
      <div />

      <template v-for="{ name, latency, invokeCount, enforce } in plugins" :key="name">
        <div />
        <div>
          <PluginName :name="name" />
        </div>
        <div class="text-center p0!">
          <Badge
            v-if="enforce"
            class="m-auto text-base"
            :class="[enforce === 'post' ? 'bg-purple-400/10 text-purple-400': 'bg-green-400/10 text-green-400']"
          >
            {{ enforce }}
          </Badge>
        </div>
        <div class="text-right">
          {{ invokeCount }}
        </div>
        <div class="text-right" :class="getLatencyColor(latency / invokeCount)">
          {{ +(latency / invokeCount).toFixed(1) }} ms
        </div>
        <div class="text-right" :class="getLatencyColor(latency / invokeCount)">
          {{ latency }} ms
        </div>
        <div />
      </template>
    </div>
  </Container>
</template>
