---
name: writing-vite-devtools-integrations
description: >
  Creates devtools integrations for Vite using @vitejs/devtools-kit.
  Use when building Vite plugins with devtools panels, RPC functions,
  dock entries, shared state, or any devtools-related functionality.
  Applies to files importing from @vitejs/devtools-kit or containing
  devtools.setup hooks in Vite plugins.
---

# Vite DevTools Kit

Build custom developer tools that integrate with Vite DevTools using `@vitejs/devtools-kit`.

## Core Concepts

A DevTools plugin extends a Vite plugin with a `devtools.setup(ctx)` hook. The context provides:

| Property | Purpose |
|----------|---------|
| `ctx.docks` | Register dock entries (iframe, action, custom-render) |
| `ctx.views` | Host static files for UI |
| `ctx.rpc` | Register RPC functions, broadcast to clients |
| `ctx.rpc.sharedState` | Synchronized server-client state |
| `ctx.viteConfig` | Resolved Vite configuration |
| `ctx.viteServer` | Dev server instance (dev mode only) |
| `ctx.mode` | `'dev'` or `'build'` |

## Quick Start: Minimal Plugin

```ts
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'

export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    devtools: {
      setup(ctx) {
        ctx.docks.register({
          id: 'my-plugin',
          title: 'My Plugin',
          icon: 'ph:puzzle-piece-duotone',
          type: 'iframe',
          url: 'https://example.com/devtools',
        })
      },
    },
  }
}
```

## Quick Start: Full Integration

```ts
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import { fileURLToPath } from 'node:url'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export default function myAnalyzer(): Plugin {
  const data = new Map<string, { size: number }>()

  return {
    name: 'my-analyzer',

    // Collect data in Vite hooks
    transform(code, id) {
      data.set(id, { size: code.length })
    },

    devtools: {
      setup(ctx) {
        // 1. Host static UI
        const clientPath = fileURLToPath(
          new URL('../dist/client', import.meta.url)
        )
        ctx.views.hostStatic('/.my-analyzer/', clientPath)

        // 2. Register dock entry
        ctx.docks.register({
          id: 'my-analyzer',
          title: 'Analyzer',
          icon: 'ph:chart-bar-duotone',
          type: 'iframe',
          url: '/.my-analyzer/',
        })

        // 3. Register RPC function
        ctx.rpc.register(
          defineRpcFunction({
            name: 'my-analyzer:get-data',
            type: 'query',
            setup: () => ({
              handler: async () => Array.from(data.entries()),
            }),
          })
        )
      },
    },
  }
}
```

## Namespacing Convention

**CRITICAL**: Always prefix RPC functions, shared state keys, and dock IDs with your plugin name:

```ts
// Good - namespaced
'my-plugin:get-modules'
'my-plugin:state'

// Bad - may conflict
'get-modules'
'state'
```

## Dock Entry Types

| Type | Use Case |
|------|----------|
| `iframe` | Full UI panels, dashboards (most common) |
| `action` | Buttons that trigger client-side scripts (inspectors, toggles) |
| `custom-render` | Direct DOM access in panel (framework mounting) |

### Iframe Entry

```ts
ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:house-duotone',
  type: 'iframe',
  url: '/.my-plugin/',
})
```

### Action Entry

```ts
ctx.docks.register({
  id: 'my-inspector',
  title: 'Inspector',
  icon: 'ph:cursor-duotone',
  type: 'action',
  action: {
    importFrom: 'my-plugin/devtools-action',
    importName: 'default',
  },
})
```

### Custom Render Entry

```ts
ctx.docks.register({
  id: 'my-custom',
  title: 'Custom View',
  icon: 'ph:code-duotone',
  type: 'custom-render',
  renderer: {
    importFrom: 'my-plugin/devtools-renderer',
    importName: 'default',
  },
})
```

## RPC Functions

### Server-Side Definition

```ts
import { defineRpcFunction } from '@vitejs/devtools-kit'

const getModules = defineRpcFunction({
  name: 'my-plugin:get-modules',
  type: 'query', // 'query' | 'action' | 'static'
  setup: ctx => ({
    handler: async (filter?: string) => {
      // ctx has full DevToolsNodeContext
      return modules.filter(m => !filter || m.includes(filter))
    },
  }),
})

// Register in setup
ctx.rpc.register(getModules)
```

### Client-Side Call (iframe)

```ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

const rpc = await getDevToolsRpcClient()
const modules = await rpc.call('my-plugin:get-modules', 'src/')
```

### Client-Side Call (action/renderer script)

```ts
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DevToolsClientScriptContext) {
  ctx.current.events.on('entry:activated', async () => {
    const data = await ctx.current.rpc.call('my-plugin:get-data')
  })
}
```

### Broadcasting to Clients

```ts
// Server broadcasts to all clients
ctx.rpc.broadcast({
  method: 'my-plugin:on-update',
  args: [{ changedFile: '/src/main.ts' }],
})
```

## Type Safety

Extend the DevTools Kit interfaces for full type checking:

```ts
// src/types.ts
import '@vitejs/devtools-kit'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'my-plugin:get-modules': (filter?: string) => Promise<Module[]>
  }

  interface DevToolsRpcClientFunctions {
    'my-plugin:on-update': (data: { changedFile: string }) => void
  }

  interface DevToolsRpcSharedStates {
    'my-plugin:state': MyPluginState
  }
}
```

## Shared State

### Server-Side

```ts
const state = await ctx.rpc.sharedState.get('my-plugin:state', {
  initialValue: { count: 0, items: [] },
})

// Read
console.log(state.value())

// Mutate (auto-syncs to clients)
state.mutate((draft) => {
  draft.count += 1
  draft.items.push('new item')
})
```

### Client-Side

```ts
const client = await getDevToolsRpcClient()
const state = await client.rpc.sharedState.get('my-plugin:state')

// Read
console.log(state.value())

// Subscribe to changes
state.on('updated', (newState) => {
  console.log('State updated:', newState)
})
```

## Client Scripts

For action buttons and custom renderers:

```ts
// src/devtools-action.ts
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DevToolsClientScriptContext) {
  ctx.current.events.on('entry:activated', () => {
    console.log('Action activated')
    // Your inspector/tool logic here
  })

  ctx.current.events.on('entry:deactivated', () => {
    console.log('Action deactivated')
    // Cleanup
  })
}
```

Export from package.json:

```json
{
  "exports": {
    ".": "./dist/index.mjs",
    "./devtools-action": "./dist/devtools-action.mjs"
  }
}
```

## Best Practices

1. **Always namespace** - Prefix all identifiers with your plugin name
2. **Use type augmentation** - Extend `DevToolsRpcServerFunctions` for type-safe RPC
3. **Keep state serializable** - No functions or circular references in shared state
4. **Batch mutations** - Use single `mutate()` call for multiple changes
5. **Host static files** - Use `ctx.views.hostStatic()` for your UI assets
6. **Use Iconify icons** - Prefer `ph:*` (Phosphor) icons: `icon: 'ph:chart-bar-duotone'`

## Further Reading

- [RPC Patterns](./references/rpc-patterns.md) - Advanced RPC patterns and type utilities
- [Dock Entry Types](./references/dock-entry-types.md) - Detailed dock configuration options
- [Shared State Patterns](./references/shared-state-patterns.md) - Framework integration examples
- [Project Structure](./references/project-structure.md) - Recommended file organization
