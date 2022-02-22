<script setup lang="ts">
import type { PluginInfo } from '../../../types'
import { onRefetch } from '../../logic'

const { data, execute } = useFetch(computed(() => '/__inspect_api/plugin'), { immediate: true })
  .get()
  .json<{ plugins: PluginInfo[] }>()

const plugins = computed(
  () => data.value ? [...data.value.plugins].sort((a, b) => b.latency - a.latency) : null,
)

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
      Plugins
    </div>
  </NavBar>
  <Container v-if="data" class="overflow-auto">
    <div class="mb-4 grid grid-cols-[auto,min-content,1fr] border-main border-t">
      <PluginCol class="flex items-end font-bold">
        Name
      </PluginCol>
      <PluginCol class="flex items-end font-bold">
        Total Latency
      </PluginCol>
      <PluginCol />
      <template v-for="{name, latency} in plugins" :key="name">
        <PluginCol class="text-sm font-mono">
          {{ name }}
        </PluginCol>
        <PluginCol class="text-sm font-mono whitespace-nowrap text-right">
          {{ latency }} ms
        </PluginCol>
        <PluginCol />
      </template>
    </div>
  </Container>
</template>
