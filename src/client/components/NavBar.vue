<script setup lang="ts">
import { isStaticMode, refetch, toggleDark } from '../logic'
</script>

<template>
  <nav class="font-light pr-6 pl-4 border-b border-main flex gap-4 h-54px children:my-auto flex-none">
    <slot />
    <slot name="actions">
      <button v-if="!isStaticMode" class="icon-btn text-lg" title="Refetch" @click="refetch()">
        <div i-carbon-renew />
      </button>
      <button class="icon-btn text-lg" title="Toggle Dark Mode" @click="toggleDark()">
        <div i-carbon-sun dark:i-carbon-moon />
      </button>
    </slot>
  </nav>
</template>
