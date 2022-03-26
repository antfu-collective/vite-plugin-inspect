<template>
  <main class="text-gray-700 dark:text-gray-200 w-screen h-screen grid grid-rows-[min-content_1fr]">
    <Suspense>
      <router-view />
      <template #fallback>
        Loading...
      </template>
    </Suspense>
  </main>
</template>
