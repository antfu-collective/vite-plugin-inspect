<script setup lang="ts">
import { computed } from 'vue'
import { list, root } from '../logic'

const props = withDefaults(
  defineProps<{
    id?: string
    icon?: boolean
  }>(),
  {
    icon: true,
  },
)

const isVirtual = computed(() => list.value?.modules.find(i => i.id === props.id)?.virtual)
</script>

<template>
  <div v-if="id" my-auto text-sm font-mono flex="~ items-center">
    <FileIcon v-if="icon" :filename="id" mr1.5 />
    <template v-if="id.startsWith(root)">
      <span class="op50">.</span>
      <span>{{ id.slice(root.length) }}</span>
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
