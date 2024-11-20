<script setup lang="ts">
import type { Data, Options } from 'vis-network'
import type { ModuleInfo } from '../../types'
import { Network } from 'vis-network'
import { colors } from '../../../color'
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

const shapes = [
  { type: 'source', icon: 'i-ic-outline-circle' },
  { type: 'virtual', icon: 'i-ic-outline-square rotate-45 scale-85' },
  { type: 'node_modules', icon: 'i-ic-outline-hexagon' },
]
const router = useRouter()

const data = computed<Data>(() => {
  const modules = (props.modules || [])
  const nodes: Data['nodes'] = modules.map((mod) => {
    const path = mod.id.replace(/\?.*$/, '').replace(/#.*$/, '')
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
      flex="~ col"
      absolute bottom-3 right-3 w-38
      select-none rounded bg-opacity-75 p3 text-sm shadow backdrop-blur-8 bg-main
    >
      <div
        v-for="color of colors" :key="color.type"
        flex="~ gap-2 items-center"
      >
        <div h-3 w-3 rounded-full :style="{ backgroundColor: color.color }" />
        <div>
          {{ color.type }}
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
        v-model="graphWeightMode"
        flex-col text-sm
        name="weight"
        :options="weightItems"
      />
    </div>
  </div>
</template>
