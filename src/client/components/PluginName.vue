<script setup lang="ts">
const props = defineProps<{
  name: string
  hide?: boolean
}>()

const starts = [
  '__load__',
  'vite:',
  'vite-plugin-',
  'vite-',
  'rollup-plugin-',
  'rollup-',
  'unplugin-',
]

const parts = computed(() => {
  for (const s of starts) {
    if (props.name.startsWith(s))
      return [s, props.name.slice(s.length)]
  }
  return ['', props.name]
})
</script>

<template>
  <span v-if="parts[0] && !hide" class="opacity-50">
    {{ parts[0] }}
  </span>
  <span>
    {{ parts[1] }}
  </span>
</template>
