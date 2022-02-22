<script setup lang="ts">
import { isDark, refetch, toggleDark } from '../logic'
</script>

<template>
  <nav class="font-light px-6 border-b border-main flex gap-4 h-54px children:my-auto">
    <slot />
    <button class="icon-btn text-lg" title="Refetch" @click="refetch()">
      <carbon:renew />
    </button>
    <button class="icon-btn text-lg" title="Toggle Dark Mode" @click="toggleDark()">
      <carbon-moon v-if="isDark" />
      <carbon-sun v-else />
    </button>
  </nav>
</template>
