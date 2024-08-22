<script setup lang="ts">
import { vTooltip } from 'floating-vue'
import { list, root } from '../logic'

const props = withDefaults(
  defineProps<{
    id?: string
    icon?: boolean
    module?: boolean
  }>(),
  {
    icon: true,
  },
)

const isVirtual = computed(() => list.value?.modules.find(i => i.id === props.id)?.virtual)
const moduleName = computed(() =>
  props.id?.startsWith(root.value)
    ? props.id.slice(root.value.length)
    : props.id ?? '',
)

const gridStyles = computed(() => {
  if (!props.module)
    return ''

  const gridColumns: string[] = []
  if (props.icon)
    gridColumns.push('min-content')

  if (props.module)
    gridColumns.push('minmax(0,1fr)')
  else
    gridColumns.push('100%')

  // todo: handle slot, not being used

  if (isVirtual.value)
    gridColumns.push('min-content')

  return `grid-template-columns: ${gridColumns.join(' ')};`
})
const containerClass = computed(() => {
  return props.module
    ? 'grid grid-rows-1 items-center gap-1'
    : 'flex items-center'
})
</script>

<template>
  <div
    v-if="id"
    v-tooltip.bottom-start="{
      content: moduleName,
      triggers: ['hover', 'focus'],
      disabled: !module,
    }"
    my-auto text-sm font-mono
    :class="containerClass"
    :style="gridStyles"
  >
    <FileIcon v-if="icon" :filename="id" mr1.5 />
    <span :class="{ 'overflow-hidden': module }">
      <template v-if="id.startsWith(root)">
        <span class="op50">.</span>
      </template>
      <span :class="{ 'text-truncate': module }">{{ moduleName }}</span>
    </span>
    <slot />

    <Badge
      v-if="isVirtual"
      class="ml1 badge-virtual"
      v-text="'virtual'"
    />
  </div>
</template>
