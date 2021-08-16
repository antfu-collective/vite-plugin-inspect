<script setup lang="ts">
import { list } from '../logic'
import { clearRoot } from '../logic/utils'
</script>

<template>
  <div v-if="list.data && list.data.ids">
    <RouterLink
      class="block border-b border-main px-3 py-2 text-left font-mono text-sm"
      v-for="id in list.data.ids"
      :key="id"
      :to="`/id?id=${encodeURIComponent(id)}`"
    >
      {{ clearRoot(id) }}
    </RouterLink>
  </div>
</template>
