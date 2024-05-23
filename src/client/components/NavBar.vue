<script setup lang="ts">
import {
  toggleDark,
} from '../logic'
</script>

<template>
  <nav h-54px flex="~ none gap-2" border="b main" pl-4 pr-4 font-light children:my-auto>
    <slot />
    <slot name="actions">
      <div mx1 h-full w-0 border="r main" />
      <a
        text-lg icon-btn
        href="https://github.com/antfu/vite-plugin-inspect"
        target="_blank"
      >
        <div i-carbon-logo-github />
      </a>
      <button class="text-lg icon-btn" title="Toggle Dark Mode" @click="toggleDark()">
        <div i-carbon-sun dark:i-carbon-moon />
      </button>
    </slot>
  </nav>
</template>
