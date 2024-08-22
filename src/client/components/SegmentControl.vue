<script setup lang="ts">
defineProps<{
  options: { label: string, value: string }[]
  modelValue: string
}>()

defineEmits<{
  (event: 'update:modelValue', newValue: string): void
}>()
</script>

<template>
  <div
    flex="~ gap-1 items-center" border="~ subtle rounded" bg-subtle p1
  >
    <Badge
      v-for="option in options"
      :key="option.value"
      class="px-2 py-1 text-xs font-mono"
      :class="option.value === modelValue ? '' : 'op50'"
      :color="option.value === modelValue"
      :aria-pressed="option.value === modelValue"
      size="none"
      :text="option.label"
      as="button"
      @click="$emit('update:modelValue', option.value)"
    />
  </div>
</template>
