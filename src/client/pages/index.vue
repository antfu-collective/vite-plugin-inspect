<script setup lang="ts">
import { listMode, refetch, searchResults, toggleMode } from '../logic'

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
    <RouterLink text-lg icon-btn to="/metric" title="Metrics">
      <div i-carbon-meter />
    </RouterLink>
    <button text-lg icon-btn title="View Mode" @click="toggleMode()">
      <div v-if="listMode === 'detailed'" i-carbon-list-boxes />
      <div v-else-if="listMode === 'list'" i-carbon-list />
      <div v-else i-carbon-network-4 />
    </button>
    <a
      text-lg icon-btn
      href="https://github.com/antfu/vite-plugin-inspect"
      target="_blank"
    >
      <div i-carbon-logo-github />
    </a>
  </NavBar>
  <Container of-auto>
    <KeepAlive>
      <Graph v-if="listMode === 'graph'" :modules="searchResults" />
      <ModuleList v-else :modules="searchResults" />
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
