<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{ name: string }>()
const router = useRouter()
</script>

<template>
  <div>
    <p class="text-4xl">
      <carbon-pedestrian class="inline-block" />
    </p>
    <p>
      Hi, {{ props.name }}
    </p>
    <p class="text-sm opacity-50">
      <em>Dynamic route!</em>
    </p>

    <div>
      <button
        class="btn m-3 text-sm mt-8"
        @click="router.back()"
      >
        Back
      </button>
    </div>
  </div>
</template>
