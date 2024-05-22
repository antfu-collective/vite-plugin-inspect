<script setup lang="ts">
import { useDataStore } from '../stores/data'
import { useStateStore } from '../stores/state'

const state = useStateStore()
const data = useDataStore()
</script>

<template>
  <input
    v-model="state.search.text"
    type="text"
    class="border border-main rounded bg-transparent px-3 py-1 !outline-none"
    placeholder="Search..."
  >
  <div class="h-min flex flex-col select-none gap-1 whitespace-nowrap text-xs">
    <label class="flex">
      <input v-model="state.search.includeNodeModules" type="checkbox" class="my-auto">
      <div class="ml-1">node_modules</div>
    </label>
    <div class="flex gap-2">
      <label class="flex">
        <input v-model="state.search.includeVirtual" type="checkbox" class="my-auto">
        <div class="ml-1">virtual</div>
      </label>
      <!-- <label class="flex">
        <input v-model="inspectSSR" type="checkbox" class="my-auto">
        <div class="ml-1">ssr</div>
      </label> -->
      <label class="flex">
        <input v-model="state.search.exactSearch" type="checkbox" class="my-auto">
        <div class="ml-1">exact search</div>
      </label>
    </div>
  </div>
  <div>
    <div flex="~ gap-1 items-center" border="~ subtle rounded" bg-subtle p1>
      <Badge
        v-for="env in data.instance.environments"
        :key="env"
        size="none"
        as="button" px2 py1 text-xs font-mono
        :class="data.query.env === env ? '' : 'op50'"
        :text="env"
        :color="data.query.env === env"
        @click="data.query.env = env"
      />
    </div>
  </div>
</template>
