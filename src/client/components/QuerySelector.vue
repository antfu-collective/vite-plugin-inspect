<script setup lang="ts">
import { useDataStore } from '../stores/data'

const data = useDataStore()
</script>

<template>
  <div>
    <div flex="~ gap-1 items-center" border="~ subtle rounded" bg-subtle p1>
      <Badge
        v-for="env in data.instance.environments"
        :key="env"
        size="none"
        as="button" px2 py1 text-xs font-mono
        :class="data.query.env === env ? '' : 'op50'"
        :text="env"
        :color="data.query.env === env"
        @click="data.query.env = env"
      />
    </div>
  </div>
</template>
