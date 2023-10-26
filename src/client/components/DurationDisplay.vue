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
    return 'text-gray:75'
  duration = duration * props.factor
  if (duration < 1)
    return 'text-gray:75'
  if (duration > 1000)
    return 'text-red-400'
  if (duration > 500)
    return 'text-orange-400'
  if (duration > 200)
    return 'text-yellow-400'
  return ''
}

const units = computed(() => {
  if (props.duration == null)
    return ['-', '']
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
  <div :class="getDurationColor(duration)">
    {{ units[0] }}<span ml-1 text-xs op50>{{ units[1] }}</span>
  </div>
</template>
