<template>
  <main grid="~ rows-[min-content_1fr]" size="h-screen w-screen" text="gray-700 dark:gray-200">
    <Suspense>
      <router-view />
      <template #fallback>
        Loading...
      </template>
    </Suspense>
  </main>
</template>
