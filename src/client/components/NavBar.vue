<script setup lang="ts">
import { isStaticMode, toggleDark } from '../logic'
import { usePayloadStore } from '../stores/payload'

const payload = usePayloadStore()
</script>

<template>
  <nav h-54px flex="~ none gap-2" border="b main" pl-4 pr-4 font-light children:my-auto>
    <slot />
    <slot name="actions">
      <Badge
        :text="isStaticMode ? 'BUILD' : 'DEV'"
        :color="isStaticMode ? 30 : 150"
        size="none" px1.5 py0.5 text-10px font-bold tracking-wider
      />
      <template v-if="!payload.metadata.embedded">
        <div mx1 h-full w-0 border="r main" />
        <a
          icon-btn text-lg
          href="https://github.com/antfu/vite-plugin-inspect"
          target="_blank"
        >
          <div i-carbon-logo-github />
        </a>
        <button class="icon-btn text-lg" title="Toggle Dark Mode" @click="toggleDark()">
          <span i-carbon-sun dark:i-carbon-moon />
        </button>
      </template>
    </slot>
  </nav>
</template>
