<script setup lang="ts">
import { isStaticMode } from './logic'
import { useDataStore } from './stores/data'

onMounted(() => {
  if (isStaticMode)
    document.title = 'Vite Inspect (Production)'
})

const data = useDataStore()
await data.init()
</script>

<template>
  <main grid="~ rows-[min-content_1fr]" size="h-screen w-screen">
    <Suspense>
      <RouterView />
      <template #fallback>
        Loading...
      </template>
    </Suspense>
  </main>
</template>
