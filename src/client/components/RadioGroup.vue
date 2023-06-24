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
  <div class="flex gap-2">
    <div v-for="opt in options" :key="opt.value" class="flex items-center">
      <input
        :id="opt.value"
        :name="name"
        :checked="modelValue === opt.value"
        :value="opt.value" type="radio" class="m-auto"
        @change="onChange"
      >
      <label class="ml-1 text-[14px]">{{ opt.label }}</label>
    </div>
  </div>
</template>
