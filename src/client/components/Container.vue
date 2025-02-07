<script setup lang="ts">
const emit = defineEmits(['element'])
</script>

<template>
  <div :ref="el => emit('element', el)" class="h-[calc(100vh-55px)]">
    <slot />
  </div>
</template>
