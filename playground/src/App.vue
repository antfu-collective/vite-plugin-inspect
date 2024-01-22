<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <main>
    <nav>
      <RouterLink to="/">
        Home
      </RouterLink>
      <RouterLink to="/other">
        Other
      </RouterLink>
    </nav>

    <RouterView />
  </main>
</template>
