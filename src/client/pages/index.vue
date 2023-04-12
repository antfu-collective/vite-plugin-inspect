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
    <div class="flex-auto" />
    <RouterLink class="icon-btn text-lg" to="/plugins-metric" title="Metrics">
      <div i-carbon-meter />
    </RouterLink>
    <button class="icon-btn text-lg" title="View Mode" @click="toggleMode()">
      <div v-if="listMode === 'detailed'" i-carbon-list-boxes />
      <div v-else-if="listMode === 'list'" i-carbon-list />
      <div v-else i-carbon-network-4 />
    </button>
    <a
      class="icon-btn text-lg"
      href="https://github.com/antfu/vite-plugin-inspect"
      target="_blank"
    >
      <div i-carbon-logo-github />
    </a>
  </NavBar>
  <Container class="overflow-auto">
    <KeepAlive>
      <Graph v-if="listMode === 'graph'" :modules="searchResults" />
      <ModuleList v-else :modules="searchResults" />
    </KeepAlive>
  </Container>
  <div
    class="fixed left-0 top-0 right-0 bottom-0 transition-all flex overflow-hidden bg-black/50"
    :class="isRoot ? 'pointer-events-none opacity-0' : 'opacity-100'"
  >
    <RouterLink class="min-w-70px h-full flex-auto" to="/" />
    <div
      class="bg-white dark:bg-[#111] border-main border-l h-full w-[calc(100vw-100px)] overflow-hidden shadow-lg transition-transform transform duration-300"
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
