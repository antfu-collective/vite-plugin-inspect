<script setup lang="ts">
import { usePayloadStore } from '../stores/payload'

const payload = usePayloadStore()
</script>

<template>
  <div flex="~ gap-2">
    <SegmentControl
      v-if="payload.metadata.instances.length > 1"
      v-model="payload.query.vite"
      :options="payload.metadata.instances.map(i => ({ label: i.vite, value: i.vite }))"
    />
    <SegmentControl
      v-model="payload.query.env"
      :options="payload.instance.environments.map(i => ({ label: i, value: i }))"
    />
  </div>
</template>
