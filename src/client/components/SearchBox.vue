<script setup lang="ts">
import { useOptionsStore } from '../stores/options'

const options = useOptionsStore()
</script>

<template>
  <input
    v-model="options.search.text"
    type="text"
    class="border border-main rounded bg-transparent px-3 py-1 !outline-none"
    placeholder="Search..."
  >
  <div class="h-min flex flex-col select-none gap-1 whitespace-nowrap text-xs">
    <div class="flex gap-2">
      <label class="flex">
        <input v-model="options.search.exactSearch" type="checkbox" class="my-auto">
        <div class="ml-1">exact search</div>
      </label>
    </div>
    <div class="flex gap-2">
      <label class="flex">
        <input v-model="options.search.includeNodeModules" type="checkbox" class="my-auto">
        <div class="ml-1">node_modules</div>
      </label>
      <label class="flex">
        <input v-model="options.search.includeVirtual" type="checkbox" class="my-auto">
        <div class="ml-1">virtual</div>
      </label>
      <label class="flex">
        <input v-model="options.search.includeUnreached" type="checkbox" class="my-auto">
        <div class="ml-1">unreached</div>
      </label>
    </div>
  </div>
</template>
