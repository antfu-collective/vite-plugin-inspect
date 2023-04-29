<script setup lang="ts">
import { listMode, searchText } from '../logic'

const props = defineProps<{
  modules: Array<{
    id: string
    plugins: any[]
  }>
}>()

const { list, containerProps, wrapperProps } = useVirtualList(
  toRef(props, 'modules'),
  {
    itemHeight: listMode.value === 'detailed' ? 53 : 37,
  },
)
</script>

<template>
  <div v-if="modules" class="h-full">
    <div v-if="!modules.length" px-6 py-4 italic op50>
      <div v-if="searchText">
        No search result
      </div>
      <div v-else>
        No module recorded yet, visit
        <a href="/" target="_blank">your app</a> first and then refresh this
        page.
      </div>
    </div>

    <div v-else v-bind="containerProps" class="h-full">
      <div v-bind="wrapperProps">
        <RouterLink
          v-for="m in list"
          :key="m.data.id"
          class="block border-b border-main px-3 py-2 text-left font-mono text-sm"
          :to="`/module?id=${encodeURIComponent(m.data.id)}`"
        >
          <ModuleId :id="m.data.id" />
          <div v-if="listMode === &quot;detailed&quot;" text-xs op50>
            <template
              v-for="(i, idx) in m.data.plugins
                .slice(1)
                .filter((plugin) => plugin.transform !== undefined)"
              :key="i"
            >
              <span v-if="idx !== 0" op20>|</span>
              <span class="mx-0.5">
                <PluginName :name="i.name" :hide="true" />
              </span>
            </template>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
