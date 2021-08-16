<script setup lang="ts">
import { isDark, toggleDark, enableDiff, lineWrapping, refetch } from '../logic'

defineProps<{
  id?: string
}>()
</script>

<template>
  <nav class="text-xl font-light px-6 border-b border-main flex gap-4 h-54px">
    <router-link v-if="$route.path != '/'" class="icon-btn !outline-none my-auto" to="/">
      <carbon-arrow-left />
    </router-link>
    <ModuleId v-if="id" :id="id" />
    <span v-else class="text-md my-auto">Vite Inspect</span>
    <div class="flex-auto"></div>
    <template v-if="$route.path != '/'">
      <button class="icon-btn !outline-none my-auto" @click="lineWrapping = !lineWrapping">
        <carbon:text-wrap :class="lineWrapping ? 'opacity-100' : 'opacity-25'" />
      </button>
      <button class="icon-btn !outline-none my-auto" @click="enableDiff = !enableDiff">
        <carbon:compare :class="enableDiff ? 'opacity-100' : 'opacity-25'" />
      </button>
    </template>
    <template v-else>
      <a
        class="icon-btn !outline-none my-auto"
        href="https://github.com/antfu/vite-plugin-inspect"
        target="_blank"
      >
        <carbon:logo-github />
      </a>
    </template>
    <button class="icon-btn !outline-none my-auto" @click="refetch()">
      <carbon:renew />
    </button>
    <button class="icon-btn !outline-none my-auto" @click="toggleDark()">
      <carbon-moon v-if="isDark" />
      <carbon-sun v-else />
    </button>
  </nav>
</template>
