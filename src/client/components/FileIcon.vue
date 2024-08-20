<script setup lang="ts">
import { isDark } from '../logic/dark'

const props = defineProps<{
  filename: string
}>()

const map = {
  angular: 'i-catppuccin-angular',
  vue: 'i-catppuccin-vue',
  js: 'i-catppuccin-javascript',
  mjs: 'i-catppuccin-javascript',
  cjs: 'i-catppuccin-javascript',
  ts: 'i-catppuccin-typescript',
  mts: 'i-catppuccin-typescript',
  cts: 'i-catppuccin-typescript',
  md: 'i-catppuccin-markdown',
  markdown: 'i-catppuccin-markdown',
  mdx: 'i-catppuccin-mdx',
  jsx: 'i-catppuccin-javascript-react',
  tsx: 'i-catppuccin-typescript-react',
  svelte: 'i-catppuccin-svelte',
  html: 'i-catppuccin-html',
  css: 'i-catppuccin-css',
  scss: 'i-catppuccin-css',
  less: 'i-catppuccin-less',
  json: 'i-catppuccin-json',
  yaml: 'i-catppuccin-yaml',
  toml: 'i-catppuccin-toml',
  svg: 'i-catppuccin-svg',
} as Record<string, string>

const icon = computed(() => {
  let file = props.filename
  file = file
    .replace(/(\?|&)v=[^&]*/, '$1')
    .replace(/\?$/, '')

  if (file.match(/[\\/]node_modules[\\/]/))
    return 'i-catppuccin-folder-node-open'

  let ext = (file.split('.').pop() || '').toLowerCase()
  let icon = map[ext]
  if (icon)
    return icon

  ext = ext.split('?')[0]
  icon = map[ext]
  if (icon)
    return icon

  return 'i-catppuccin-file'
})
</script>

<template>
  <div
    flex-none
    :class="[icon, isDark ? '' : 'brightness-60 hue-rotate-180 invert-100 saturate-200']"
  />
</template>
