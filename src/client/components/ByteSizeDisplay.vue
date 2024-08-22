<script setup lang="ts">
const props = defineProps<{
  bytes: number
}>()

function byteToHumanReadable(byte: number): [string | number, string] {
  if (byte < 1024)
    return [byte, 'B']
  if (byte < 1024 * 1024)
    return [(byte / 1024).toFixed(2), 'KB']
  if (byte < 1024 * 1024 * 1024)
    return [(byte / 1024 / 1024).toFixed(2), 'MB']
  return [(byte / 1024 / 1024 / 1024).toFixed(2), 'GB']
}

const readable = computed(() => byteToHumanReadable(props.bytes))
</script>

<template>
  <NumberWithUnit :number="readable[0]" :unit="readable[1]" />
</template>
