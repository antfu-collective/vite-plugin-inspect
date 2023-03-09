<script setup lang="ts">
import { inspectSSR, onRefetch } from '../../logic'
import { getHot } from '../../logic/hot'
import { rpc } from '../../logic/rpc'

const data = ref(await rpc.getPluginMetrics(inspectSSR.value))

const plugins = computed(
  () => data.value || [],
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

async function refetch() {
  data.value = await rpc.getPluginMetrics(inspectSSR.value)
}

onRefetch.on(async () => {
  await refetch()
})

getHot().then((hot) => {
  if (hot) {
    hot.on('vite-plugin-inspect:update', () => {
      refetch()
    })
  }
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
    <div class="mb-4 grid grid-cols-[1fr_max-content_max-content_max-content_max-content_max-content_1fr] mt-2 whitespace-nowrap text-sm font-mono children:(px-4 py-2 border-b border-main align-middle)">
      <div />
      <div class="font-bold text-xs">
        Name ({{ plugins.length }})
      </div>
      <div class="font-bold text-xs text-center">
        Type
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

      <template v-for="{ name, totalTime, invokeCount, enforce } in plugins" :key="name">
        <div />
        <div>
          <PluginName :name="name" />
        </div>
        <div class="text-center p0! flex items-center">
          <Badge
            v-if="enforce"
            class="m-auto text-xs"
            :class="[enforce === 'post' ? 'bg-purple5/10 text-purple5' : 'bg-green5/10 text-green5']"
          >
            {{ enforce }}
          </Badge>
        </div>
        <template v-if="invokeCount">
          <div class="text-right">
            {{ invokeCount }}
          </div>
          <div class="text-right" :class="getLatencyColor(totalTime / invokeCount)">
            {{ +(totalTime / invokeCount).toFixed(1) }}<span op50 ml-1 text-xs>ms</span>
          </div>
          <div class="text-right" :class="getLatencyColor(totalTime / invokeCount)">
            {{ totalTime }}<span op50 ml-1 text-xs>ms</span>
          </div>
        </template>
        <template v-else>
          <div class="text-right">
            -
          </div>
          <div class="text-right">
            -
          </div>
          <div class="text-right">
            -
          </div>
        </template>
        <div />
      </template>
    </div>
  </Container>
</template>
