<script setup lang="ts">
import { computed } from 'vue'
import { usePayloadStore } from '../stores/payload'

const props = defineProps<{
  id?: string
  badges?: boolean
}>()

const payload = usePayloadStore()

const mod = computed(() => payload.modules.find(i => i.id === props.id))
</script>

<template>
  <div v-if="id" my-auto text-sm font-mono flex="~ items-center gap-1">
    <span v-if="id.startsWith(payload.root)">
      <span class="op50">.</span>
      <span>{{ id.slice(payload.root.length) }}</span>
    </span>
    <span v-else>{{ id }}</span>
    <slot />

    <template v-if="badges">
      <Badge
        v-if="mod?.virtual"
        text="virtual"
      />
      <Badge
        v-if="mod && !mod.sourceSize"
        text="unreached" saturate-0
      />
    </template>
  </div>
</template>
