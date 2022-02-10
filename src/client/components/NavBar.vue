<script setup lang="ts">
import { enableDiff, isDark, lineWrapping, listMode, refetch, toggleDark, toggleMode } from '../logic'

defineProps<{
  id?: string
}>()
</script>

<template>
  <nav class="font-light px-6 border-b border-main flex gap-4 h-54px children:my-auto">
    <template v-if="$route.path != '/'">
      <router-link v-if="$route.path != '/'" class="icon-btn !outline-none my-auto" to="/">
        <carbon-arrow-left />
      </router-link>
      <ModuleId v-if="id" :id="id" />
      <div class="flex-auto" />
      <button class="icon-btn text-lg" title="Line Wrapping" @click="lineWrapping = !lineWrapping">
        <carbon:text-wrap :class="lineWrapping ? 'opacity-100' : 'opacity-25'" />
      </button>
      <button class="icon-btn text-lg" title="Toggle Diff" @click="enableDiff = !enableDiff">
        <carbon:compare :class="enableDiff ? 'opacity-100' : 'opacity-25'" />
      </button>
    </template>
    <template v-else>
      <span class="text-md">Vite Inspect</span>
      <SearchBox />
      <div class="flex-auto" />
      <button class="icon-btn text-lg" title="View Mode" @click="toggleMode()">
        <carbon:list-boxes v-if="listMode === 'detailed'" />
        <carbon:list v-else-if="listMode === 'list'" />
        <carbon:network-4 v-else />
      </button>
      <a
        class="icon-btn text-lg"
        href="https://github.com/antfu/vite-plugin-inspect"
        target="_blank"
      >
        <carbon:logo-github />
      </a>
    </template>
    <button class="icon-btn text-lg" title="Refetch" @click="refetch()">
      <carbon:renew />
    </button>
    <button class="icon-btn text-lg" title="Toggle Dark Mode" @click="toggleDark()">
      <carbon-moon v-if="isDark" />
      <carbon-sun v-else />
    </button>
  </nav>
</template>
