<script setup lang="ts">
import {
  isStaticMode,
  toggleDark,
} from '../logic'
import {
  onUserRefresh,
} from '../logic/rpc'

const props = defineProps<{
  name: string
}>()
</script>

<template>
  <nav h-54px flex="~ none gap-5" border="b main" pl-4 pr-6 font-light children:my-auto>
    <slot />
    <slot name="actions">
      <button
        v-if="!isStaticMode"
        class="text-lg icon-btn" title="Refetch"
        @click="onUserRefresh.trigger(props.name)"
      >
        <div i-carbon-renew />
      </button>
      <div h-full w-1 border="r main" />
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
