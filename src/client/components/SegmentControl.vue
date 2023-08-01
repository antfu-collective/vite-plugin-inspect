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
  <div class="flex overflow-hidden border border-main rounded divide-x divide-gray-400 divide-opacity-30">
    <button
      v-for="option in options"
      :key="option.value"
      class="px-2 py-1 text-sm font-mono"
      :class="{ 'bg-active': option.value === modelValue }"
      :aria-pressed="option.value === modelValue"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
