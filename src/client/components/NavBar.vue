<script setup lang="ts">
import { isStaticMode, refetch, toggleDark } from '../logic'
</script>

<template>
  <nav h-54px flex="~ none gap-4" border="b main" pl-4 pr-6 font-light children:my-auto>
    <slot />
    <slot name="actions">
      <button v-if="!isStaticMode" class="text-lg icon-btn" title="Refetch" @click="refetch()">
        <div i-carbon-renew />
      </button>
      <button class="text-lg icon-btn" title="Toggle Dark Mode" @click="toggleDark()">
        <div i-carbon-sun dark:i-carbon-moon />
      </button>
    </slot>
  </nav>
</template>
