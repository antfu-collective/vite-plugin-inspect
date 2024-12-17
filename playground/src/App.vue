<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <main>
    <nav>
      <RouterLink to="/">
        Home
      </RouterLink>
      <span px-1rem>|</span>
      <RouterLink to="/other">
        Other
      </RouterLink>
      <span px-1rem>|</span>
      <RouterLink to="/error">
        Error
      </RouterLink>
    </nav>

    <RouterView />
  </main>
</template>
