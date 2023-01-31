<script setup lang="ts">
import type { Data, Options } from 'vis-network'
import { Network } from 'vis-network'
import type { ModuleInfo } from '../../types'
import { isDark } from '../logic'

const props = defineProps<{
  modules?: ModuleInfo[]
}>()

const container = ref<HTMLDivElement | null>()
const router = useRouter()

const data = computed<Data>(() => {
  const modules = (props.modules || [])
  const nodes: Data['nodes'] = modules.map((mod) => {
    const path = mod.id.replace(/\?.*$/, '').replace(/\#.*$/, '')
    return {
      id: mod.id,
      label: path.split('/').splice(-1)[0],
      group: path.match(/\.(\w+)$/)?.[1] || 'unknown',
      size: 15 + Math.min(mod.deps.length / 2, 8),
      font: { color: isDark.value ? 'white' : 'black' },
      shape: mod.id.includes('/node_modules/')
        ? 'hexagon'
        : mod.virtual
          ? 'diamond'
          : 'dot',
    }
  })
  const edges: Data['edges'] = modules.flatMap(mod => mod.deps.map(dep => ({
    from: mod.id,
    to: dep,
    arrows: {
      to: {
        enabled: true,
        scaleFactor: 0.8,
      },
    },
  })))

  return {
    nodes,
    edges,
  }
})

onMounted(() => {
  const options: Options = {
    nodes: {
      shape: 'dot',
      size: 16,
    },
    physics: {
      maxVelocity: 146,
      solver: 'forceAtlas2Based',
      timestep: 0.35,
      stabilization: {
        enabled: true,
        iterations: 200,
      },
    },
    groups: {
      vue: {
        color: '#42b883',
      },
      ts: {
        color: '#41b1e0',
      },
      js: {
        color: '#d6cb2d',
      },
      json: {
        color: '#cf8f30',
      },
      css: {
        color: '#e6659a',
      },
      html: {
        color: '#e34c26',
      },
      svelte: {
        color: '#ff3e00',
      },
      jsx: {
        color: '#7d6fe8',
      },
      tsx: {
        color: '#7d6fe8',
      },
    },
  }
  const network = new Network(container.value!, data.value, options)

  network.on('click', (data) => {
    const node = data.nodes?.[0]
    if (node)
      router.push(`/module?id=${encodeURIComponent(node)}`)
  })

  watch(data, () => {
    network.setData(data.value)
  })
})
</script>

<template>
  <div v-if="modules">
    <div ref="container" class="w-full h-100vh" />
  </div>
</template>
