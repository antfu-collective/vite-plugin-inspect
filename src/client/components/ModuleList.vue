<script setup lang="ts">
import { list } from '../logic'
</script>

<template>
  <div v-if="list.data && list.data.modules">
    <RouterLink
      v-for="m in list.data.modules"
      :key="m.id"
      class="block border-b border-main px-3 py-2 text-left font-mono text-sm"
      :to="`/module?id=${encodeURIComponent(m.id)}`"
    >
      <ModuleId :id="m.id" />
    </RouterLink>
  </div>
</template>
