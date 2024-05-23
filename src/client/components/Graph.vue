<script setup lang="ts">
import type { Data, Options } from 'vis-network'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import type { ModuleInfo } from '../../types'
import { isDark } from '../logic'
import { useOptionsStore } from '../stores/options'
import { useSearchResults } from '../stores/search'

const search = useSearchResults()
const options = useOptionsStore()

function colorPair(color: string) {
  return {
    color,
    font: { color },
  }
}

const colors = {
  vue: colorPair('#42b883'),
  ts: colorPair('#41b1e0'),
  js: colorPair('#d6cb2d'),
  json: colorPair('#cf8f30'),
  css: colorPair('#e6659a'),
  html: colorPair('#e34c26'),
  svelte: colorPair('#ff3e00'),
  jsx: colorPair('#7d6fe8'),
  tsx: colorPair('#6f99e8'),
  faded: colorPair('#888'),
}

function getModuleWeight(mod: ModuleInfo, mode: 'deps' | 'transform' | 'resolveId') {
  const value = 10 + (mode === 'deps' ? Math.min(mod.deps.length, 30) : Math.min(mod.plugins.reduce((total, plg) => total + (plg[mode as 'transform' | 'resolveId'] || 0), 0) / 20, 30))
  return value
}

const container = ref<HTMLDivElement | null>()
const weightItems = [
  { value: 'deps', label: 'dependency count' },
  { value: 'transform', label: 'transform time' },
  { value: 'resolveId', label: 'resolveId time' },
]

const shapes = [
  { type: 'source', icon: 'i-ic-outline-circle' },
  { type: 'virtual', icon: 'i-ic-outline-square rotate-45 scale-85' },
  { type: 'node_modules', icon: 'i-ic-outline-hexagon' },
]
const router = useRouter()

const data = computed(() => {
  const modules = search.filtered
  const nodes = new DataSet(modules.map((mod) => {
    const path = mod.id.replace(/\?.*$/, '').replace(/#.*$/, '')
    const group = path.match(/\.(\w+)$/)?.[1] || 'unknown'
    return {
      id: mod.id,
      label: path.split('/').splice(-1)[0],
      group,
      defaultGroup: group,
      size: getModuleWeight(mod, options.view.graphWeightMode),
      shape: mod.id.includes('/node_modules/')
        ? 'hexagon'
        : mod.virtual
          ? 'diamond'
          : 'dot',
    }
  }))
  const edges: Data['edges'] = modules.flatMap(mod => mod.deps.map(dep => ({
    from: mod.id,
    to: dep,
    arrows: {
      to: {
        enabled: true,
        scaleFactor: 0.8,
      },
    },
    color: {
      opacity: 0.8,
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
    groups: colors,
  }
  const network = new Network(container.value!, data.value, options)

  const clicking = ref(false)

  network.on('click', () => {
    clicking.value = true
  })

  network.on('hold', () => {
    clicking.value = false
  })

  network.on('dragStart', () => {
    clicking.value = false
  })

  network.on('release', (data) => {
    const node = data.nodes?.[0]
    if (clicking.value && node) {
      router.push(`/module?id=${encodeURIComponent(node)}`)
      clicking.value = false
    }
  })

  watch(data, () => {
    network.setData(data.value)
  })

  watch(
    () => search.results,
    () => {
      const nodes = data.value.nodes

      nodes.forEach((node) => {
        const mod = search.results.find(mod => mod.id === node.id)
        nodes.update({ id: node.id, group: mod ? node.defaultGroup : 'faded' })
      })
    },
  )
})
</script>

<template>
  <div v-if="search.filtered">
    <div ref="container" h-100vh w-full />
    <div
      border="~ main"
      flex="~ col"
      absolute bottom-3 right-3 w-38
      select-none rounded bg-opacity-75 p3 text-sm shadow backdrop-blur-8 bg-main
    >
      <div
        v-for="value, key of colors" :key="key"
        flex="~ gap-2 items-center"
      >
        <div h-3 w-3 rounded-full :style="{ backgroundColor: value.color }" />
        <div>
          {{ key }}
        </div>
      </div>
      <div border="t base" my3 h-1px />
      <div
        v-for="shape of shapes" :key="shape.type"
        flex="~ gap-2 items-center"
      >
        <div :class="shape.icon" flex-none />
        <div>
          {{ shape.type }}
        </div>
      </div>
    </div>
    <div
      border="~ main"
      absolute bottom-3 left-3 rounded bg-opacity-75 p3 text-sm shadow backdrop-blur-8 bg-main
      flex="~ col gap-1"
    >
      <span text-sm op50>weight by</span>
      <RadioGroup
        v-model="options.view.graphWeightMode"
        flex-col text-sm
        name="weight"
        :options="weightItems"
      />
    </div>
  </div>
</template>
