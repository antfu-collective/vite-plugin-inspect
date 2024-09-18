<script setup lang="ts">
import type { ModuleInfo } from '../../types'
import { listMode, searchText } from '../logic'

const props = defineProps<{
  modules: readonly ModuleInfo[]
}>()

const route = useRoute()

const { list, containerProps, wrapperProps } = useVirtualList(
  toRef(props, 'modules') as Ref<ModuleInfo[]>,
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
          class="block border-b border-main hover:bg-active px-3 py-2 text-left text-sm font-mono"
          :to="{
            path: '/module',
            query: {
              ...route.query,
              id: m.data.id,
            },
          }"
        >
          <ModuleId :id="m.data.id" />
          <div v-if="listMode === 'detailed'" text-xs flex="~ gap-1">
            <template
              v-for="(i, idx) in m.data.plugins
                .slice(1)
                .filter((plugin) => plugin.transform !== undefined)"
              :key="i"
            >
              <span v-if="idx !== 0" op20>|</span>
              <span ws-nowrap op50>
                <PluginName :name="i.name" :compact="true" />
              </span>
            </template>
            <template v-if="m.data.invokeCount > 2">
              <span op40>|</span>
              <span
                status-green
                :title="`Transform invoked ${m.data.invokeCount} times`"
              >x{{ m.data.invokeCount }}</span>
            </template>
            <div flex-auto />
            <template v-if="m.data.sourceSize && m.data.distSize">
              <ByteSizeDisplay op75 :bytes="m.data.sourceSize" />
              <span i-carbon-arrow-right op50 />
              <ByteSizeDisplay
                :class="m.data.distSize > m.data.sourceSize ? 'status-yellow' : 'status-green'"
                :bytes="m.data.distSize"
              />
              <span op40>|</span>
            </template>
            <span>
              <DurationDisplay :duration="m.data.totalTime" />
            </span>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
