<script setup lang="ts">
import { showPluginNames } from '../logic'

defineProps<{
  modules: any[]
}>()
</script>

<template>
  <div v-if="modules">
    <RouterLink
      v-for="m in modules"
      :key="m.id"
      class="block border-b border-main px-3 py-2 text-left font-mono text-sm"
      :to="`/module?id=${m.id}`"
    >
      <ModuleId :id="m.id" />
      <div v-if="showPluginNames" class="text-xs">
        <template v-for="i, idx in m.plugins.slice(1)" :key="i">
          <span v-if="idx !== 0">|</span>
          <span class="mx-0.5 text-gray-400">{{ i }}</span>
        </template>
      </div>
    </RouterLink>
  </div>
</template>
