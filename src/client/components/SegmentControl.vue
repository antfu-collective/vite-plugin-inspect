<script setup lang="ts">
defineProps<{
  options: { label: string; value: string }[]
  modelValue: string
}>()
defineEmits<{
  (event: 'update:modelValue', newValue: string): void
}>()
</script>

<template>
  <div class="flex overflow-hidden rounded border border-main divide-x divide-gray-400 divide-opacity-30">
    <button
      v-for="option in options"
      :key="option.value"
      class="text-sm font-mono px-2 py-1"
      :class="{ 'bg-black dark:bg-white bg-opacity-10 dark:bg-opacity-10': option.value === modelValue }"
      :aria-pressed="option.value === modelValue"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
