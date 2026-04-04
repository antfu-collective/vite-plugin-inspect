import type { ModuleInfo } from '../../types'

export interface CircularEdge {
  from: string
  to: string
}

export interface CircularResult {
  /** All module IDs that participate in circular dependencies */
  nodes: Set<string>
  edges: Set<string> //  All edges that form circular dependencies, keyed as `${from}\0${to}`
  /** Each individual cycle as an array of module IDs */
  cycles: string[][]
}

/** Detect all circular dependencies in the module dependency graph.\n * Uses DFS with path tracking to collect all cycles. */
export function detectCircularDeps(modules: readonly ModuleInfo[]): CircularResult {
  const adj = new Map<string, string[]>()
  const idSet = new Set<string>()

  for (const mod of modules) {
    idSet.add(mod.id)
    adj.set(mod.id, mod.deps.filter(d => idSet.has(d) || modules.some(m => m.id === d)))
  }

  for (const mod of modules) {
    adj.set(mod.id, mod.deps.filter(d => adj.has(d)))
  }

  const circularNodes = new Set<string>()
  const circularEdges = new Set<string>()
  const cycles: string[][] = []

  // 0 = unvisited, 1 = in stack, 2 = done
  const state = new Map<string, number>()
  const path: string[] = []

  function dfs(node: string) {
    state.set(node, 1)
    path.push(node)

    for (const dep of adj.get(node) || []) {
      const depState = state.get(dep) ?? 0
      if (depState === 1) {
        // Found a cycle — extract it from the path
        const cycleStart = path.indexOf(dep)
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart)
          cycles.push([...cycle])
          for (let i = 0; i < cycle.length; i++) {
            circularNodes.add(cycle[i])
            const next = cycle[(i + 1) % cycle.length]
            circularEdges.add(`${cycle[i]}\0${next}`)
          }
        }
      }
      else if (depState === 0) {
        dfs(dep)
      }
    }

    path.pop()
    state.set(node, 2)
  }

  for (const mod of modules) {
    if ((state.get(mod.id) ?? 0) === 0)
      dfs(mod.id)
  }

  return { nodes: circularNodes, edges: circularEdges, cycles }
}

export function edgeKey(from: string, to: string): string {
  return `${from}\0${to}`
}
