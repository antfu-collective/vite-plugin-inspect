<script setup lang="ts">
import type { ModuleInfo } from '../../types'
import { useOptionsStore } from '../stores/options'
import { usePayloadStore } from '../stores/payload'

const props = defineProps<{
  modules: readonly ModuleInfo[]
}>()

const options = useOptionsStore()
const payload = usePayloadStore()

const route = useRoute()

const { list, containerProps, wrapperProps } = useVirtualList(
  toRef(props, 'modules') as Ref<ModuleInfo[]>,
  {
    itemHeight: options.view.listMode === 'detailed' ? 53 : 37,
  },
)

function byteToHumanReadable(byte: number) {
  if (byte < 1024)
    return `${byte}B`
  if (byte < 1024 * 1024)
    return `${(byte / 1024).toFixed(2)}KB`
  if (byte < 1024 * 1024 * 1024)
    return `${(byte / 1024 / 1024).toFixed(2)}MB`
  return `${(byte / 1024 / 1024 / 1024).toFixed(2)}GB`
}
</script>

<template>
  <div v-if="modules" class="h-full">
    <div v-if="!modules.length" px-6 py-4 italic op50>
      <div v-if="options.search.text">
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
          :key="`${payload.query.vite}-${payload.query.env}-${m.data.id}`"
          class="block border-b border-main hover:bg-active px-3 py-2 text-left text-sm font-mono"
          :to="{
            path: '/module',
            query: {
              ...route.query,
              id: m.data.id,
            },
          }"
        >
          <ModuleId :id="m.data.id" badges ws-nowrap />
          <div v-if="options.view.listMode === 'detailed'" flex="~ gap-1" text-xs>
            <div flex="~ auto gap-1" of-hidden>
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
                <span op40>·</span>
                <span
                  text-green
                  :title="`Transform invoked ${m.data.invokeCount} times`"
                >x{{ m.data.invokeCount }}</span>
              </template>
            </div>
            <div flex="~ none gap-1 wrap justify-end">
              <span op75>
                <DurationDisplay :duration="m.data.totalTime" />
              </span>
              <template v-if="m.data.sourceSize && m.data.distSize">
                <span op40>·</span>
                <span op50>{{ byteToHumanReadable(m.data.sourceSize) }}</span>
                <span i-carbon-arrow-right op40 />
                <span op50 :class="m.data.distSize > m.data.sourceSize ? 'text-orange' : 'text-green'">{{ byteToHumanReadable(m.data.distSize) }}</span>
              </template>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
