<script setup>
import { onMounted, ref } from 'vue'
import message from 'virtual:hi'

const message2 = ref('Loading...')

onMounted(() => {
  import('virtual:slow:2').then(m => message2.value = m.default)
})
</script>

<template>
  <div>
    <div>Other: {{ message }}</div>
    <div>Slow Message: {{ message2 }}</div>
  </div>
</template>
