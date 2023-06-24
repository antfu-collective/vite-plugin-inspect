<script setup lang="ts">
defineProps<{
  cls?: string
  name: string
  modelValue: string
  options: { value: boolean; label: string }[] }>()

defineEmits(['update:modelValue'])
</script>

<template>
  <div :class="`flex gap-2 py-1 ${cls ?? ''}`">
    <div v-for="opt in options" :key="opt.value" class="flex items-center">
      <input :id="opt.value" :name="name" :checked="modelValue === opt.value" :value="opt.value" type="radio" class="m-auto" @change="$emit('update:modelValue', $event.target.value)">
      <label class="ml-1 text-[14px]">{{ opt.label }}</label>
    </div>
  </div>
</template>
