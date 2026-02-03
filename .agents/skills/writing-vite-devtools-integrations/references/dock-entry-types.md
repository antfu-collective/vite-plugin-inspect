# Dock Entry Types

Detailed configuration for each dock entry type.

## Common Properties

All dock entries share these properties:

```ts
interface DockEntryBase {
  id: string // Unique identifier
  title: string // Display title
  icon: string // URL, data URI, or Iconify name
  category?: string // Grouping category
  defaultOrder?: number // Sort order (higher = earlier)
  isHidden?: boolean // Hide from dock
}
```

## Icons

<!-- eslint-skip -->

```ts
// Iconify (recommended)
icon: 'ph:chart-bar-duotone'  // Phosphor Icons
icon: 'carbon:analytics'       // Carbon Icons
icon: 'mdi:view-dashboard'     // Material Design

// URL
icon: 'https://example.com/logo.svg'

// Data URI
icon: 'data:image/svg+xml,<svg>...</svg>'

// Light/dark variants
icon: {
  light: 'https://example.com/logo-light.svg',
  dark: 'https://example.com/logo-dark.svg',
}
```

Browse icons at [Iconify](https://icon-sets.iconify.design/).

## Iframe Entries

Most common type. Displays your UI in an isolated iframe.

```ts
interface IframeEntry extends DockEntryBase {
  type: 'iframe'
  url: string // URL to load
  frameId?: string // Share iframe between entries
  clientScript?: ClientScriptEntry // Optional client script
}

// Example
ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:house-duotone',
  type: 'iframe',
  url: '/.my-plugin/',
})
```

### Hosting Your Own UI

```ts
import { fileURLToPath } from 'node:url'

const clientDist = fileURLToPath(
  new URL('../dist/client', import.meta.url)
)

ctx.views.hostStatic('/.my-plugin/', clientDist)

ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:house-duotone',
  type: 'iframe',
  url: '/.my-plugin/',
})
```

## Action Entries

Buttons that trigger client-side scripts. Perfect for inspectors and toggles.

```ts
interface ActionEntry extends DockEntryBase {
  type: 'action'
  action: {
    importFrom: string // Package export path
    importName?: string // Export name (default: 'default')
  }
}

// Registration
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

### Client Script Implementation

```ts
// src/devtools-action.ts
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DevToolsClientScriptContext) {
  let overlay: HTMLElement | null = null

  ctx.current.events.on('entry:activated', () => {
    overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      cursor: crosshair;
      z-index: 99999;
    `
    overlay.onclick = (e) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)
      console.log('Selected:', target)
    }
    document.body.appendChild(overlay)
  })

  ctx.current.events.on('entry:deactivated', () => {
    overlay?.remove()
    overlay = null
  })
}
```

### Package Export

```json
{
  "exports": {
    ".": "./dist/index.mjs",
    "./devtools-action": "./dist/devtools-action.mjs"
  }
}
```

## Custom Render Entries

Render directly into the DevTools panel DOM. Use when you need direct DOM access or framework mounting.

```ts
interface CustomRenderEntry extends DockEntryBase {
  type: 'custom-render'
  renderer: {
    importFrom: string
    importName?: string
  }
}

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

### Renderer Implementation

```ts
// src/devtools-renderer.ts
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DevToolsClientScriptContext) {
  ctx.current.events.on('dom:panel:mounted', (panel) => {
    // Vanilla JS
    panel.innerHTML = `<div style="padding: 16px;">Hello</div>`

    // Or mount Vue
    // import { createApp } from 'vue'
    // import App from './App.vue'
    // createApp(App).mount(panel)

    // Or mount React
    // import { createRoot } from 'react-dom/client'
    // createRoot(panel).render(<App />)
  })
}
```

## Client Script Events

| Event | Payload | Description |
|-------|---------|-------------|
| `entry:activated` | - | Entry was selected |
| `entry:deactivated` | - | Entry was deselected |
| `entry:updated` | `DevToolsDockUserEntry` | Entry metadata changed |
| `dom:panel:mounted` | `HTMLDivElement` | Panel DOM ready (custom-render only) |
| `dom:iframe:mounted` | `HTMLIFrameElement` | Iframe mounted (iframe only) |

## Category Order

Default category ordering:

```ts
DEFAULT_CATEGORIES_ORDER = {
  '~viteplus': -1000, // First
  'default': 0,
  'app': 100,
  'framework': 200,
  'web': 300,
  'advanced': 400,
  '~builtin': 1000, // Last
}
```

Use `category` to group related entries:

```ts
ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:house-duotone',
  type: 'iframe',
  url: '/.my-plugin/',
  category: 'framework',
})
```
