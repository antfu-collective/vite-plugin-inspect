<script setup lang="ts">
import { exactSearch, includeNodeModules, includeVirtual, inspectSSR, searchText } from '../logic'
</script>

<template>
  <input
    v-model="searchText"
    type="text"
    class="border border-main px-3 py-1 rounded bg-transparent !outline-none"
    placeholder="Search..."
  >
  <div class="text-xs flex flex-col h-min select-none">
    <label class="flex">
      <input v-model="includeNodeModules" type="checkbox" class="my-auto">
      <div class="ml-1">node_modules</div>
    </label>
    <div class="flex gap-2">
      <label class="flex">
        <input v-model="includeVirtual" type="checkbox" class="my-auto">
        <div class="ml-1">virtual</div>
      </label>
      <label class="flex">
        <input v-model="inspectSSR" type="checkbox" class="my-auto">
        <div class="ml-1">ssr</div>
      </label>
      <label class="flex">
        <input v-model="exactSearch" type="checkbox" class="my-auto">
        <div class="ml-1">exact search</div>
      </label>
    </div>
  </div>
</template>
