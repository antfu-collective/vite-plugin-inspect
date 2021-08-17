<script setup lang="ts">
import { onMounted } from 'vue'
import { refetch, searchResults } from '../logic'

onMounted(() => {
  refetch()
})
</script>

<template>
  <NavBar />
  <Container class="overflow-auto">
    <ModuleList :modules="searchResults"/>
  </Container>
</template>
