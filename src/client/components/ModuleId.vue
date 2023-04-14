<script setup lang="ts">
import { computed } from 'vue'
import { list, root } from '../logic'

const props = defineProps<{ id?: string }>()

const isVirtual = computed(() => list.value?.modules.find(i => i.id === props.id)?.virtual)
</script>

<template>
  <div v-if="id" my-auto font-mono text-sm>
    <template v-if="id.startsWith(root)">
      <span class="op50">.</span>
      <span>{{ id.slice(root.length) }}</span>
    </template>
    <span v-else>{{ id }}</span>

    <Badge
      v-if="isVirtual"
      bg-teal-400:10 text-teal-400
      v-text="'virtual'"
    />
  </div>
</template>
