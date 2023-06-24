import type { ModuleInfo } from '../../types'

export const graphWeightMode = useStorage<'deps' | 'transform' | 'resolveId'>('vite-inspect-graph-weight-mode', 'deps')

export function getModuleWeight(mod: ModuleInfo, mode: 'deps' | 'transform' | 'resolveId') {
  const value = 10 + (mode === 'deps' ? Math.min(mod.deps.length, 30) : Math.min(mod.plugins.reduce((total, plg) => total + (plg[mode as 'transform' | 'resolveId'] || 0), 0) / 20, 30))
  return value
}
