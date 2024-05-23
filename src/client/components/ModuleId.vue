<script setup lang="ts">
import { computed } from 'vue'
import { usePayloadStore } from '../stores/payload'

const props = defineProps<{ id?: string }>()

const payload = usePayloadStore()

const isVirtual = computed(() => payload.modules.find(i => i.id === props.id)?.virtual)
</script>

<template>
  <div v-if="id" my-auto text-sm font-mono flex="~ items-center">
    <template v-if="id.startsWith(payload.root)">
      <span class="op50">.</span>
      <span>{{ id.slice(payload.root.length) }}</span>
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
