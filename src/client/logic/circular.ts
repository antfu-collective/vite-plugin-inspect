import type { ModuleInfo } from '../../types'

export interface CircularResult {
  /** All module IDs that participate in circular dependencies */
  nodes: Set<string>
  /** All edges that form circular dependencies, keyed as `${from}\0${to}` */
  edges: Set<string>
  /** Each individual cycle as an array of module IDs */
  cycles: string[][]
}

/**
 * Yield each cycle found in the module dependency graph.
 * Uses DFS with path tracking. Cancellable — consumer can break early.
 */
export function* findCircularDeps(modules: readonly ModuleInfo[]): Generator<string[]> {
  const idSet = new Set(modules.map(m => m.id))
  const adj = new Map<string, string[]>()
  for (const mod of modules)
    adj.set(mod.id, mod.deps.filter(d => idSet.has(d)))

  // 0 = unvisited, 1 = in stack, 2 = done
  const state = new Map<string, number>()
  const path: string[] = []

  function* dfs(node: string): Generator<string[]> {
    state.set(node, 1)
    path.push(node)

    for (const dep of adj.get(node) || []) {
      const s = state.get(dep) ?? 0
      if (s === 1) {
        const start = path.indexOf(dep)
        if (start !== -1)
          yield path.slice(start)
      }
      else if (s === 0) {
        yield* dfs(dep)
      }
    }

    path.pop()
    state.set(node, 2)
  }

  for (const mod of modules) {
    if ((state.get(mod.id) ?? 0) === 0)
      yield* dfs(mod.id)
  }
}

/**
 * Collect all circular dependencies into a single result.
 * Consumes the generator fully.
 */
export function detectCircularDeps(modules: readonly ModuleInfo[]): CircularResult {
  const nodes = new Set<string>()
  const edges = new Set<string>()
  const cycles: string[][] = []

  for (const cycle of findCircularDeps(modules)) {
    cycles.push([...cycle])
    for (let i = 0; i < cycle.length; i++) {
      nodes.add(cycle[i])
      edges.add(edgeKey(cycle[i], cycle[(i + 1) % cycle.length]))
    }
  }

  return { nodes, edges, cycles }
}

export function edgeKey(from: string, to: string): string {
  return `${from}\0${to}`
}
