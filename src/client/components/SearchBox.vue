<script setup lang="ts">
import {
  currentInstance,
  currentQuery,
  exactSearch,
  includeNodeModules,
  includeVirtual,
  searchText,
} from '../logic'
</script>

<template>
  <input
    v-model="searchText"
    type="text"
    class="border border-main rounded bg-transparent px-3 py-1 !outline-none"
    placeholder="Search..."
  >
  <div class="h-min flex flex-col select-none gap-1 whitespace-nowrap text-xs">
    <label class="flex">
      <input v-model="includeNodeModules" type="checkbox" class="my-auto">
      <div class="ml-1">node_modules</div>
    </label>
    <div class="flex gap-2">
      <label class="flex">
        <input v-model="includeVirtual" type="checkbox" class="my-auto">
        <div class="ml-1">virtual</div>
      </label>
      <!-- <label class="flex">
        <input v-model="inspectSSR" type="checkbox" class="my-auto">
        <div class="ml-1">ssr</div>
      </label> -->
      <label class="flex">
        <input v-model="exactSearch" type="checkbox" class="my-auto">
        <div class="ml-1">exact search</div>
      </label>
    </div>
  </div>
  <div>
    <div flex="~ gap-1 items-center" border="~ subtle rounded" bg-subtle p1>
      <Badge
        v-for="env in currentInstance.environments"
        :key="env"
        size="none"
        as="button" px2 py1 text-xs font-mono
        :class="currentQuery.env === env ? '' : 'op50'"
        :text="env"
        :color="currentQuery.env === env"
        @click="currentQuery.env = env"
      />
    </div>
  </div>
</template>
