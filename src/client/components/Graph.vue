<script setup lang="ts">
import { Network, Data, Options } from 'vis-network'
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
      group: path.split('/').slice(0, -1).join('/'),
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
      repulsion: {
        centralGravity: 0.7,
        springLength: 100,
        springConstant: 0.01,
      },
      maxVelocity: 146,
      solver: 'repulsion',
      timestep: 0.35,
      stabilization: {
        enabled: true,
        iterations: 200,
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
    <div ref="container" class="w-full h-100vh"></div>
  </div>
</template>
