<script setup lang="ts">
import type { Data, Options } from 'vis-network'
import { Network } from 'vis-network'
import type { ModuleInfo } from '../../types'
import { getModuleWeight, graphWeightMode, isDark } from '../logic'

const props = defineProps<{
  modules?: ModuleInfo[]
}>()

const container = ref<HTMLDivElement | null>()
const weightItems = [
  { value: 'deps', label: 'dependency count' },
  { value: 'transform', label: 'transform time' },
  { value: 'resolveId', label: 'resolveId time' },
]
const router = useRouter()

const data = computed<Data>(() => {
  const modules = (props.modules || [])
  const nodes: Data['nodes'] = modules.map((mod) => {
    const path = mod.id.replace(/\?.*$/, '').replace(/\#.*$/, '')
    return {
      id: mod.id,
      label: path.split('/').splice(-1)[0],
      group: path.match(/\.(\w+)$/)?.[1] || 'unknown',
      size: getModuleWeight(mod, graphWeightMode.value),
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
    <div ref="container" h-100vh w-full />
    <div
      border="~ main"
      absolute bottom-3 right-3 z-100 rounded px3 py1 shadow bg-main
      flex="~ gap-2"
    >
      <span text-sm op50>weight by</span>
      <RadioGroup
        v-model="graphWeightMode"
        name="weight"
        :options="weightItems"
      />
    </div>
  </div>
</template>
