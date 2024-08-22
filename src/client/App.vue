<script setup lang="ts">
import { isStaticMode } from './logic'
import { usePayloadStore } from './stores/payload'

onMounted(() => {
  if (isStaticMode)
    document.title = 'Vite Inspect (Production)'
})

const payload = usePayloadStore()
await payload.init()
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
