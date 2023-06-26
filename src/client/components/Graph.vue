<script setup lang="ts">
import type { Data, Options } from 'vis-network'
import { Network } from 'vis-network'
import type { ModuleInfo } from '../../types'
import { getModuleWeight, graphWeightMode, isDark } from '../logic'
import dotSvg from '../assets/dot.svg'
import diamondSvg from '../assets/diamond.svg'
import hexagonSvg from '../assets/hexagon.svg'
import { colors } from '../../../color'

const props = defineProps<{
  modules?: ModuleInfo[]
}>()

const container = ref<HTMLDivElement | null>()
const weightItems = [
  { value: 'deps', label: 'dependency count' },
  { value: 'transform', label: 'transform time' },
  { value: 'resolveId', label: 'resolveId time' },
]
const shapes = [{ svg: dotSvg, type: 'source' }, { svg: diamondSvg, type: 'virtual' }, { svg: hexagonSvg, type: 'node_modules' }]
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
    groups: colors.reduce((groups, color) => ({ ...groups, [color.type]: { color: color.color } }), {}),
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
})
</script>

<template>
  <div v-if="modules">
    <div ref="container" h-100vh w-full />
    <div
      border="~ main"
      absolute bottom-3 right-3 z-100 rounded px3 py3 shadow bg-main
    >
      <div flex="~ gap-2" mb-2>
        <span text-sm op50>color of</span>
        <Badge v-for="color of colors" :key="color.type" class="text-[#fff]" :style="{ backgroundColor: color.color }">
          {{ color.type }}
        </Badge>
      </div>
      <div flex="~ gap-2" mb-1>
        <span text-sm op50>shape of</span>
        <span v-for="shape of shapes" :key="shape.type" flex="~ gap-1" text-14px><img :src="shape.svg" inline w-4>{{ shape.type }}</span>
      </div>
      <div flex="~ gap-2">
        <span text-sm op50>weight by</span>
        <RadioGroup
          v-model="graphWeightMode"
          name="weight"
          :options="weightItems"
        />
      </div>
    </div>
  </div>
</template>
