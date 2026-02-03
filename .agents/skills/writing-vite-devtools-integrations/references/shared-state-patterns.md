# Shared State Patterns

Synchronized state between server and all clients.

## Basic Usage

### Server-Side

```ts
const state = await ctx.rpc.sharedState.get('my-plugin:state', {
  initialValue: {
    count: 0,
    items: [],
    settings: { theme: 'dark' },
  },
})

// Read
const current = state.value()

// Mutate (syncs to all clients)
state.mutate((draft) => {
  draft.count += 1
  draft.items.push({ id: Date.now(), name: 'New' })
})
```

### Client-Side

```ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

const client = await getDevToolsRpcClient()
const state = await client.rpc.sharedState.get('my-plugin:state')

// Read
console.log(state.value())

// Subscribe
state.on('updated', (newState) => {
  console.log('Updated:', newState)
})
```

## Type-Safe Shared State

```ts
// src/types.ts
interface MyPluginState {
  count: number
  items: Array<{ id: string, name: string }>
  settings: {
    theme: 'light' | 'dark'
    notifications: boolean
  }
}

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcSharedStates {
    'my-plugin:state': MyPluginState
  }
}
```

## Vue Integration

```ts
// composables/useSharedState.ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { onMounted, shallowRef } from 'vue'

export function useSharedState<T>(name: string) {
  const state = shallowRef<T | null>(null)
  const loading = shallowRef(true)

  onMounted(async () => {
    const client = await getDevToolsRpcClient()
    const shared = await client.rpc.sharedState.get<T>(name)

    state.value = shared.value()
    loading.value = false

    shared.on('updated', (newState) => {
      state.value = newState
    })
  })

  return { state, loading }
}

// Usage in component
const { state, loading } = useSharedState<MyPluginState>('my-plugin:state')
```

### Full Vue Component Example

```vue
<script setup lang="ts">
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { onMounted, shallowRef } from 'vue'

interface PluginState {
  count: number
  items: string[]
}

const state = shallowRef<PluginState | null>(null)

onMounted(async () => {
  const client = await getDevToolsRpcClient()
  const shared = await client.rpc.sharedState.get<PluginState>('my-plugin:state')

  state.value = shared.value()

  shared.on('updated', (newState) => {
    state.value = newState
  })
})
</script>

<template>
  <div v-if="state">
    <p>Count: {{ state.count }}</p>
    <ul>
      <li v-for="item in state.items" :key="item">
        {{ item }}
      </li>
    </ul>
  </div>
</template>
```

## React Integration

```tsx
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { useEffect, useState } from 'react'

function useSharedState<T>(name: string, fallback: T) {
  const [state, setState] = useState<T>(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function init() {
      const client = await getDevToolsRpcClient()
      const shared = await client.rpc.sharedState.get<T>(name)

      if (mounted) {
        setState(shared.value() ?? fallback)
        setLoading(false)

        shared.on('updated', (newState) => {
          if (mounted)
            setState(newState)
        })
      }
    }

    init()
    return () => {
      mounted = false
    }
  }, [name])

  return { state, loading }
}

// Usage
function MyComponent() {
  const { state, loading } = useSharedState('my-plugin:state', { count: 0 })

  if (loading)
    return <div>Loading...</div>

  return (
    <div>
      Count:
      {state.count}
    </div>
  )
}
```

## Svelte Integration

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

  interface PluginState {
    count: number
  }

  const state = writable<PluginState>({ count: 0 })

  onMount(async () => {
    const client = await getDevToolsRpcClient()
    const shared = await client.rpc.sharedState.get<PluginState>('my-plugin:state')

    state.set(shared.value())

    shared.on('updated', (newState) => {
      state.set(newState)
    })
  })
</script>

<p>Count: {$state.count}</p>
```

## Best Practices

### Batch Mutations

```ts
// Good - single sync event
state.mutate((draft) => {
  draft.count += 1
  draft.lastUpdate = Date.now()
  draft.items.push(newItem)
})

// Bad - multiple sync events
state.mutate((d) => {
  d.count += 1
})
state.mutate((d) => {
  d.lastUpdate = Date.now()
})
state.mutate((d) => {
  d.items.push(newItem)
})
```

### Keep State Small

For large datasets, store IDs in shared state and fetch details via RPC:

<!-- eslint-skip -->
```ts
// Shared state (small)
{
  moduleIds: ['a', 'b', 'c'],
  selectedId: 'a'
}

// Fetch full data via RPC when needed
const module = await rpc.call('my-plugin:get-module', state.selectedId)
```

### Serializable Data Only

<!-- eslint-skip -->
```ts
// Bad - functions can't be serialized
{ count: 0, increment: () => {} }

// Bad - circular references
const obj = { child: null }
obj.child = obj

// Good - plain data
{ count: 0, items: [{ id: 1 }] }
```

### Real-Time Updates Example

```ts
const plugin: Plugin = {
  devtools: {
    async setup(ctx) {
      const state = await ctx.rpc.sharedState.get('my-plugin:state', {
        initialValue: { modules: [], lastUpdate: 0 },
      })

      // Update state when Vite processes modules
      ctx.viteServer?.watcher.on('change', (file) => {
        state.mutate((draft) => {
          draft.modules.push(file)
          draft.lastUpdate = Date.now()
        })
      })
    }
  }
}
```
