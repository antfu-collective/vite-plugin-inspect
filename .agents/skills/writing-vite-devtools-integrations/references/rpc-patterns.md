# RPC Patterns

Advanced patterns for server-client communication in DevTools integrations.

## Function Types

| Type | Caching | Use Case |
|------|---------|----------|
| `query` | Can be cached | Read operations, data fetching |
| `action` | Never cached | Mutations, side effects |
| `static` | Cached indefinitely | Constants, configuration |

## Type-Safe RPC Setup

### Step 1: Define Types

```ts
// src/types.ts
import '@vitejs/devtools-kit'

interface Module {
  id: string
  size: number
  imports: string[]
}

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'my-plugin:list-modules': () => Promise<Module[]>
    'my-plugin:get-module': (id: string) => Promise<Module | null>
    'my-plugin:analyze': (options: { deep: boolean }) => Promise<void>
  }

  interface DevToolsRpcClientFunctions {
    'my-plugin:highlight': (selector: string) => void
    'my-plugin:refresh': () => void
  }
}
```

### Step 2: Import Types File

```ts
// src/node/plugin.ts
import '../types' // Side-effect import for type augmentation
```

### Step 3: Register Functions

```ts
import { defineRpcFunction } from '@vitejs/devtools-kit'

const listModules = defineRpcFunction({
  name: 'my-plugin:list-modules',
  type: 'query',
  setup: () => ({
    handler: async (): Promise<Module[]> => {
      return Array.from(moduleMap.values())
    },
  }),
})
```

## Context Access in Setup

The `setup` function receives the full `DevToolsNodeContext`:

```ts
defineRpcFunction({
  name: 'my-plugin:get-config',
  type: 'static',
  setup: (ctx) => {
    // Access at setup time (runs once)
    const root = ctx.viteConfig.root
    const isDev = ctx.mode === 'dev'

    return {
      handler: async () => ({
        root,
        isDev,
        plugins: ctx.viteConfig.plugins.map(p => p.name),
      }),
    }
  },
})
```

## Broadcasting Patterns

### Basic Broadcast

```ts
// Notify all clients
ctx.rpc.broadcast({
  method: 'my-plugin:refresh',
  args: [],
})
```

### Broadcast with Data

```ts
ctx.viteServer?.watcher.on('change', (file) => {
  ctx.rpc.broadcast({
    method: 'my-plugin:file-changed',
    args: [{ path: file, timestamp: Date.now() }],
  })
})
```

### Optional Broadcast

```ts
// Won't error if no clients have registered the function
ctx.rpc.broadcast({
  method: 'my-plugin:optional-update',
  args: [data],
  optional: true,
})
```

## Client Function Registration

```ts
// Client-side (action/renderer script)
export default function setup(ctx: DevToolsClientScriptContext) {
  ctx.current.rpc.client.register({
    name: 'my-plugin:highlight',
    type: 'action',
    handler: (selector: string) => {
      const el = document.querySelector(selector)
      if (el) {
        el.style.outline = '3px solid red'
        setTimeout(() => {
          el.style.outline = ''
        }, 2000)
      }
    },
  })
}
```

## Collecting RPC Functions

Organize RPC functions in a registry pattern:

```ts
import { analyzeBundle } from './functions/analyze-bundle'
// src/node/rpc/index.ts
import { getModules } from './functions/get-modules'
import { getStats } from './functions/get-stats'

export const rpcFunctions = [
  getModules,
  getStats,
  analyzeBundle,
] as const

// Register all in setup
for (const fn of rpcFunctions) {
  ctx.rpc.register(fn)
}
```

## Type Extraction Utilities

```ts
import type {
  RpcDefinitionsFilter,
  RpcDefinitionsToFunctions,
} from '@vitejs/devtools-kit'

// Extract all function types
export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

// Extract only static functions
export type StaticFunctions = RpcDefinitionsToFunctions<
  RpcDefinitionsFilter<typeof rpcFunctions, 'static'>
>

// Augment the global interface
declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}
}
```
