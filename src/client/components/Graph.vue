<script setup lang="ts">
import { Network, Data, Options } from 'vis-network'
import type { ModuleInfo } from '../../types'

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
    }
  })
  const edges: Data['edges'] = modules.flatMap(mod => mod.deps.map(dep => ({ from: mod.id, to: dep })))

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
      forceAtlas2Based: {
        gravitationalConstant: -26,
        centralGravity: 0.005,
        springLength: 230,
        springConstant: 0.18,
      },
      maxVelocity: 146,
      solver: 'forceAtlas2Based',
      timestep: 0.35,
      stabilization: {
        iterations: 150,
        updateInterval: 100,
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
