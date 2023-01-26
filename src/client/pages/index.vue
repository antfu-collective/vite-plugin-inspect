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
    <carbon:query title="Vite Inspect" text-xl />

    <SearchBox />
    <div class="flex-auto" />
    <router-link class="icon-btn text-lg" to="/plugins-metric">
      <carbon:timer />
    </router-link>
    <button class="icon-btn text-lg" title="View Mode" @click="toggleMode()">
      <carbon:list-boxes v-if="listMode === 'detailed'" />
      <carbon:list v-else-if="listMode === 'list'" />
      <carbon:network-4 v-else />
    </button>
    <a
      class="icon-btn text-lg"
      href="https://github.com/antfu/vite-plugin-inspect"
      target="_blank"
    >
      <carbon:logo-github />
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
    <router-link class="min-w-70px h-full flex-auto" to="/" />
    <div
      class="bg-white dark:bg-[#111] border-main border-l h-full w-[calc(100vw-100px)] overflow-hidden shadow-lg transition-transform transform duration-300"
      :class="isRoot ? 'translate-x-1/2' : 'translate-x-0'"
    >
      <Suspense>
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
        <template #fallback>
          Loading...
        </template>
      </Suspense>
    </div>
  </div>
</template>
