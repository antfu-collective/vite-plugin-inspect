<script setup lang="ts">
const props = defineProps<{
  name: string
  colored?: boolean
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
const opacity = computed(() => {
  return props.colored ? 'op100 dark:op-65' : 'op75 dark:op50'
})
</script>

<template>
  <span v-if="parts[0] && !hide" :class="opacity">
    {{ parts[0] }}
  </span>
  <span :class="opacity">
    {{ parts[1] }}
  </span>
</template>
