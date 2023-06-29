<script setup lang="ts">
defineProps<{
  name: string
  modelValue: string
  options: { value: string; label: string }[]
}>()

const emit = defineEmits(['update:modelValue'])

function onChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div flex="~ gap-1">
    <label v-for="opt in options" :key="opt.value" flex="~ gap-2">
      <input
        :id="opt.value"
        :name="name"
        :checked="modelValue === opt.value"
        :value="opt.value" type="radio"
        @change="onChange"
      >
      <div>{{ opt.label }}</div>
    </label>
  </div>
</template>
