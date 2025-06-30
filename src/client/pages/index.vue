<script setup lang="ts">
import { useOptionsStore } from '../stores/options'
import { usePayloadStore } from '../stores/payload'
import { useSearchResults } from '../stores/search'

const options = useOptionsStore()
const payload = usePayloadStore()
const search = useSearchResults()

const route = useRoute()
const isRoot = computed(() => route.path === '/')
</script>

<template>
  <NavBar>
    <div i-carbon-ibm-watson-discovery title="Vite Inspect" text-xl />

    <SearchBox />
    <div flex-auto />

    <QuerySelector />
    <div mx1 h-full w-0 border="r main" />

    <template v-if="options.view.listMode === 'detailed'">
      <button
        icon-btn text-lg title="Sort" flex="~ items-center"
        :disabled="!!options.search.text"
        :class="options.search.text ? 'op50 pointer-events-none' : ''"
        @click="options.toggleSort()"
      >
        <template v-if="options.search.text">
          <span i-carbon-search />
          <span i-carbon-arrow-down text-sm op70 />
        </template>
        <template v-else-if="options.view.sort === 'time-asc'">
          <span i-carbon-time />
          <span i-carbon-arrow-down text-sm op70 />
        </template>
        <template v-else-if="options.view.sort === 'time-desc'">
          <span i-carbon-time />
          <span i-carbon-arrow-up text-sm op70 />
        </template>
        <template v-else>
          <span i-carbon-menu />
          <span i-carbon-chevron-sort text-sm op70 />
        </template>
      </button>
    </template>
    <button icon-btn text-lg title="View Mode" @click="options.toggleListMode()">
      <span v-if="options.view.listMode === 'detailed'" i-carbon-list-boxes />
      <span v-else-if="options.view.listMode === 'list'" i-carbon-list />
      <span v-else i-carbon-network-4 />
    </button>
    <div mx2 h-full w-1 border="r main" />
    <RouterLink icon-btn text-lg :to="{ path: '/metric', query: route.query }" title="Metrics">
      <span i-carbon-meter />
    </RouterLink>
    <RouterLink text-lg icon-btn to="/waterfall" title="Waterfall">
      <div i-carbon-chart-waterfall />
    </RouterLink>
    <RouterLink text-lg icon-btn :to="{ path: '/plugins', query: route.query }" title="Plugins">
      <span i-carbon-microservices-1 />
    </RouterLink>
    <button
      v-if="!payload.isStatic"
      class="icon-btn text-lg" title="Refetch"
      @click="payload.refetch()"
    >
      <span i-carbon-renew />
    </button>
  </NavBar>
  <Container of-auto>
    <KeepAlive>
      <Graph v-if="options.view.listMode === 'graph'" />
      <ModuleList v-else :modules="search.resultsSorted" />
    </KeepAlive>
  </Container>
  <div
    pos="fixed bottom-0 left-0 right-0 top-0"
    flex overflow-hidden bg-black:50 transition-all
    :class="isRoot ? 'pointer-events-none opacity-0' : 'opacity-100'"
  >
    <RouterLink h-full min-w-70px flex-auto to="/" />
    <div
      class="h-full w-[calc(100vw-100px)] transform overflow-hidden bg-main shadow-lg transition-transform duration-300"
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
