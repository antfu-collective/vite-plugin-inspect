<script setup lang="ts">
import { computed } from 'vue'
import { useDataStore } from '../stores/data'

const props = defineProps<{ id?: string }>()

const data = useDataStore()

const isVirtual = computed(() => data.modules.find(i => i.id === props.id)?.virtual)
</script>

<template>
  <div v-if="id" my-auto text-sm font-mono flex="~ items-center">
    <template v-if="id.startsWith(data.root)">
      <span class="op50">.</span>
      <span>{{ id.slice(data.root.length) }}</span>
    </template>
    <span v-else>{{ id }}</span>
    <slot />

    <Badge
      v-if="isVirtual"
      class="ml1 bg-teal-400:10 text-green-700 dark:text-teal-400"
      v-text="'virtual'"
    />
  </div>
</template>
