<script setup lang="ts">
import { isDark, toggleDark } from '../logic'

defineProps<{
  name?: string
}>()
</script>

<template>
  <nav class="text-xl font-light px-6 border-b border-main flex gap-3 h-54px">
    <router-link v-if="$route.path != '/'" class="icon-btn !outline-none my-auto" to="/">
      <carbon-arrow-left />
    </router-link>
    <div v-if="name" class="text-sm font-mono my-auto">
      {{ name }}
    </div>
    <span class="text-md my-auto" v-else>Vite Inspect</span>
    <div class="flex-auto"></div>
    <button class="icon-btn !outline-none my-auto" @click="toggleDark()">
      <carbon-moon v-if="isDark" />
      <carbon-sun v-else />
    </button>
  </nav>
</template>
