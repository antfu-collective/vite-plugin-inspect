<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    duration: number | undefined
    factor?: number
    color?: boolean
  }>(),
  {
    factor: 1,
    color: true,
  },
)

function getDurationColor(duration: number | undefined) {
  if (!props.color)
    return ''
  if (duration == null)
    return ''
  duration = duration * props.factor
  if (duration < 1)
    return ''
  if (duration > 1000)
    return 'status-red'
  if (duration > 500)
    return 'status-yellow'
  if (duration > 200)
    return 'status-green'
  return ''
}

const units = computed(() => {
  if (!props.duration)
    return ['', '-']
  if (props.duration < 1)
    return ['<1', 'ms']
  if (props.duration < 1000)
    return [props.duration.toFixed(0), 'ms']
  if (props.duration < 1000 * 60)
    return [(props.duration / 1000).toFixed(1), 's']
  return [(props.duration / 1000 / 60).toFixed(1), 'min']
})
</script>

<template>
  <NumberWithUnit :class="getDurationColor(duration)" :number="units[0]" :unit="units[1]" />
</template>
