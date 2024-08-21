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
    <span>{{ units[0] }}</span><span ml-0.4 text-xs>{{ units[1] }}</span>
  </div>
</template>

<style scoped>
div:not(.status-red) > span:first-of-type {
  @apply op80 dark:op65;
}
div:not(.status-red) > span:last-of-type {
  @apply op75 dark:op50;
}
div.status-red > span:first-of-type {
  @apply op80 dark:op95;
}
div.status-red > span:last-of-type {
  @apply op75 dark:op90;
}
</style>
