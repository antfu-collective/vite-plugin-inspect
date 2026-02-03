# Project Structure

Recommended file organization for DevTools integrations.

## Basic Structure

```
my-devtools-plugin/
├── src/
│   ├── node/
│   │   ├── index.ts          # Plugin entry (exports main plugin)
│   │   ├── rpc/
│   │   │   ├── index.ts      # RPC function exports
│   │   │   └── functions/    # Individual RPC functions
│   │   │       ├── get-modules.ts
│   │   │       └── get-stats.ts
│   │   └── utils.ts          # Server-side utilities
│   ├── client/
│   │   ├── main.ts           # Client app entry
│   │   ├── App.vue           # Root component
│   │   └── composables/
│   │       └── rpc.ts        # RPC composables
│   ├── types.ts              # Type augmentations
│   └── shared/
│       └── constants.ts      # Shared constants
├── dist/
│   ├── index.mjs             # Node plugin bundle
│   └── client/               # Built client assets
├── package.json
└── tsconfig.json
```

## Package.json Configuration

```json
{
  "name": "my-devtools-plugin",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.ts"
    },
    "./devtools-action": {
      "import": "./dist/devtools-action.mjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown src/node/index.ts && vite build src/client",
    "dev": "vite src/client"
  },
  "dependencies": {},
  "devDependencies": {
    "@vitejs/devtools-kit": "^0.x.x",
    "vite": "^6.x.x"
  }
}
```

## Plugin Entry (src/node/index.ts)

```ts
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import { fileURLToPath } from 'node:url'
import { rpcFunctions } from './rpc'
import '../types'

const clientDist = fileURLToPath(
  new URL('../../dist/client', import.meta.url)
)

export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',

    devtools: {
      setup(ctx) {
        // Register all RPC functions
        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn)
        }

        // Host static UI
        ctx.views.hostStatic('/.my-plugin/', clientDist)

        // Register dock entry
        ctx.docks.register({
          id: 'my-plugin',
          title: 'My Plugin',
          icon: 'ph:puzzle-piece-duotone',
          type: 'iframe',
          url: '/.my-plugin/',
        })
      },
    },
  }
}
```

## RPC Index (src/node/rpc/index.ts)

```ts
import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { getModules } from './functions/get-modules'
import { getStats } from './functions/get-stats'
import '@vitejs/devtools-kit'

export const rpcFunctions = [
  getModules,
  getStats,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}
}
```

## RPC Function (src/node/rpc/functions/get-modules.ts)

```ts
import type { Module } from '../../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const getModules = defineRpcFunction({
  name: 'my-plugin:get-modules',
  type: 'query',
  setup: (ctx) => {
    return {
      handler: async (): Promise<Module[]> => {
        // Access vite config, server, etc. from ctx
        const root = ctx.viteConfig.root
        return []
      },
    }
  },
})
```

## Type Augmentations (src/types.ts)

```ts
import '@vitejs/devtools-kit'

export interface Module {
  id: string
  size: number
  imports: string[]
}

export interface MyPluginState {
  modules: Module[]
  selectedId: string | null
}

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcSharedStates {
    'my-plugin:state': MyPluginState
  }
}
```

## Client Entry (src/client/main.ts)

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

## Client RPC Composable (src/client/composables/rpc.ts)

```ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

let clientPromise: Promise<Awaited<ReturnType<typeof getDevToolsRpcClient>>>

export function useRpc() {
  if (!clientPromise) {
    clientPromise = getDevToolsRpcClient()
  }
  return clientPromise
}
```

## Client App Component (src/client/App.vue)

```vue
<script setup lang="ts">
import type { Module } from '../types'
import { onMounted, shallowRef } from 'vue'
import { useRpc } from './composables/rpc'

const modules = shallowRef<Module[]>([])
const loading = shallowRef(true)

onMounted(async () => {
  const rpc = await useRpc()
  modules.value = await rpc.call('my-plugin:get-modules')
  loading.value = false
})
</script>

<template>
  <div class="p-4">
    <h1 class="text-xl font-bold mb-4">
      My Plugin
    </h1>
    <div v-if="loading">
      Loading...
    </div>
    <ul v-else>
      <li v-for="mod in modules" :key="mod.id">
        {{ mod.id }} ({{ mod.size }} bytes)
      </li>
    </ul>
  </div>
</template>
```

## Vite Config for Client (src/client/vite.config.ts)

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
})
```

## Real-World Reference

See [packages/vite](https://github.com/user/vite-devtools/tree/main/packages/vite) for a complete implementation example with:

- Multiple RPC functions organized by feature
- Nuxt-based client UI
- Complex data visualization
- Build session management
