<script setup lang="ts">
import type { ParsedError } from '../../types'

defineProps<{
  error: ParsedError
}>()

function normalizeFilename(filename?: string) {
  return (filename || '')
    .replace(/^async\s+/, '')
    .replace(/^file:\/\//, '')
}
</script>

<template>
  <div of-auto p4 font-mono flex="~ col gap-4">
    <div text-xl status-red flex="~ gap-2 items-center">
      <div i-carbon:warning-square />
      Error
    </div>
    <pre text-sm status-red>{{ error.message }}</pre>
    <div border="t main" h-1px w-full />
    <div class="text-xs" mt2 grid="~ cols-[max-content_1fr] gap-x-4 gap-y-1" font-mono>
      <template v-for="(item, idx) of error.stack" :key="idx">
        <div text-right op72 dark:op50>
          {{ item.functionName || `(anonymous)` }}
        </div>
        <div ws-nowrap>
          <FilepathItem
            :filepath="normalizeFilename(item.fileName)"
            :line="item.lineNumber"
            :column="item.columnNumber"
          />
        </div>
      </template>
    </div>
  </div>
</template>
