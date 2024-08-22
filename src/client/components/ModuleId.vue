<script setup lang="ts">
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
</script>

<template>
  <div
    v-if="id"
    v-tooltip.bottom-start="{ content: id, triggers: ['hover', 'focus'], disabled: !module }"
    my-auto text-sm font-mono
    flex="~ items-center"
  >
    <FileIcon v-if="icon" :filename="id" mr1.5 />
    <span :class="{ 'module-title': module }">
      <template v-if="id.startsWith(root)">
        <span class="op50">.</span>
      </template>
      <span :class="{ 'overflow-hidden': module }">{{ moduleName }}</span>
    </span>
    <slot />

    <Badge
      v-if="isVirtual"
      class="ml1 badge-virtual"
      v-text="'virtual'"
    />
  </div>
</template>
