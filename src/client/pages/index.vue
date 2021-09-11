<script setup lang="ts">
import { refetch, searchResults, listMode } from '../logic'

const route = useRoute()
const isRoot = computed(() => route.path === '/')
onMounted(() => {
  refetch()
})
</script>

<template>
  <NavBar />
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
    <router-link class="min-w-70px h-full" to="/"></router-link>
    <div
      class="bg-white dark:bg-[#111] border-main border-l h-full overflow-hidden flex-auto shadow-lg transition-transform transform duration-300"
      :class="isRoot ? 'translate-x-1/2' : 'translate-x-0'"
    >
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>
