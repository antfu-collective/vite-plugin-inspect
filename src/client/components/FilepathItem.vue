<script setup lang="ts">
const props = defineProps<{
  filepath: string
  line?: number
  column?: number
}>()

async function openInEditor() {
  await fetch(`/__open-in-editor?file=${encodeURI(props.filepath)}:${props.line}:${props.column}`)
}

const display = computed(() => {
  const path = props.filepath.replace(/\\/g, '/')
  if (props.filepath.includes('/node_modules/')) {
    const match = path.match(/.*\/node_modules\/(@[^/]+\/[^/]+|[^/]+)(\/.*)?$/)
    if (match)
      return [match[1], match[2]]
  }
  return [path]
})
</script>

<template>
  <button flex="~" hover="underline" @click="openInEditor">
    <span fw-600 dark:fw-unset>{{ display[0] }}</span>
    <span op72 dark:op50>{{ display[1] }}</span>
    <span v-if="props.line != null && props.column != null" op72 dark:op50>:{{ props.line }}:{{ props.column }}</span>
  </button>
</template>
