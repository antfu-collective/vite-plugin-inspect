<script setup lang="ts">
import PluginName from '../../components/PluginName.vue'
import { usePayloadStore } from '../../stores/payload'

const payload = usePayloadStore()

function renderRow(idx: number) {
  const envs = payload.instance.environments.map(e =>
    payload.instance.environmentPlugins[e].includes(idx),
  )

  const nodes: VNode[] = []

  envs.forEach((e, i) => {
    if (envs[i - 1] === e)
      return
    if (!e) {
      nodes.push(h('td'))
    }
    else {
      let length = envs.slice(i).findIndex(e => !e)
      if (length === -1)
        length = envs.length - i
      nodes.push(h('td', {
        colspan: length,
        class: 'border border-main px4 py1',
      }, [
        h(PluginName, { name: payload.instance.plugins[idx].name }),
      ]))
    }
  })

  return () => nodes
}
</script>

<template>
  <NavBar>
    <RouterLink my-auto outline-none icon-btn to="/">
      <div i-carbon-arrow-left />
    </RouterLink>
    <div flex-auto />
    <QuerySelector />
  </NavBar>
  <Container
    flex overflow-auto p5
  >
    <table w-full>
      <thead>
        <td
          v-for="e of payload.instance.environments" :key="e"
          border="~ main" p2 text-center
        >
          <Badge :text="e" size="none" px2 py1 text-sm font-mono />
        </td>
      </thead>
      <tbody>
        <tr v-for="(p, idx) of payload.instance.plugins" :key="idx">
          <component :is="renderRow(idx)" />
        </tr>
      </tbody>
    </table>
  </Container>
</template>
