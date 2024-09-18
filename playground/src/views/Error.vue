<script setup>
import { onMounted, ref } from 'vue'

const message = ref('Loading...')

onMounted(() => {
  import('virtual:slow:error').catch(err => message.value = err.message)
})
</script>

<template>
  <div>
    <div>Slow Error Message: {{ message }}</div>
  </div>
</template>
