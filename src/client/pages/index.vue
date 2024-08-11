<script setup lang="ts">
import { listMode, refetch, searchResults, searchText, sortMode, sortedSearchResults, toggleMode, toggleSort } from '../logic'

const route = useRoute()
const isRoot = computed(() => route.path === '/')

onMounted(() => {
  refetch()
})
</script>

<template>
  <NavBar>
    <div i-carbon-ibm-watson-discovery title="Vite Inspect" text-xl />
    <SearchBox />
    <div flex-auto />

    <template v-if="listMode === 'detailed'">
      <button
        text-lg icon-btn title="Sort" flex="~ items-center"
        :disabled="!!searchText"
        :class="searchText ? 'op50 pointer-events-none' : ''"
        @click="toggleSort()"
      >
        <template v-if="searchText">
          <div i-carbon-search />
          <div i-carbon-arrow-down text-sm op70 />
        </template>
        <template v-else-if="sortMode === 'time-asc'">
          <div i-carbon-time />
          <div i-carbon-arrow-down text-sm op70 />
        </template>
        <template v-else-if="sortMode === 'time-desc'">
          <div i-carbon-time />
          <div i-carbon-arrow-up text-sm op70 />
        </template>
        <template v-else>
          <div i-carbon-menu />
          <div i-carbon-chevron-sort text-sm op70 />
        </template>
      </button>
    </template>
    <button text-lg icon-btn title="View Mode" @click="toggleMode()">
      <div v-if="listMode === 'detailed'" i-carbon-list-boxes />
      <div v-else-if="listMode === 'list'" i-carbon-list />
      <div v-else i-carbon-network-4 />
    </button>
    <div h-full w-1 border="r main" />
    <RouterLink text-lg icon-btn to="/metric" title="Metrics">
      <div i-carbon-meter />
    </RouterLink>
    <RouterLink text-lg icon-btn to="/waterfall" title="Metrics">
      <div i-carbon-chart-waterfall />
    </RouterLink>
  </NavBar>
  <Container of-auto>
    <KeepAlive>
      <Graph v-if="listMode === 'graph'" :modules="searchResults" />
      <ModuleList v-else :modules="sortedSearchResults" />
    </KeepAlive>
  </Container>
  <div
    pos="fixed bottom-0 left-0 right-0 top-0"
    flex overflow-hidden bg-black:50 transition-all
    :class="isRoot ? 'pointer-events-none opacity-0' : 'opacity-100'"
  >
    <RouterLink h-full min-w-70px flex-auto to="/" />
    <div
      class="h-full w-[calc(100vw-100px)] transform overflow-hidden shadow-lg transition-transform duration-300 bg-main"
      border="l main"
      :class="isRoot ? 'translate-x-1/2' : 'translate-x-0'"
    >
      <Suspense>
        <RouterView v-slot="{ Component }">
          <KeepAlive>
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
        <template #fallback>
          Loading...
        </template>
      </Suspense>
    </div>
  </div>
</template>
