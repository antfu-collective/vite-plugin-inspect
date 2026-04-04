import type { ModuleInfo } from '../../types'

export interface CircularEdge {
  from: string
  to: string
}

export interface CircularResult {
  /** 所有参与循环依赖的模块 ID */
  nodes: Set<string>
  /** 所有构成循环的边 (from -> to) */
  edges: Set<string> // 格式: `${from}\0${to}`
  /** 每个独立的环 (用于 tooltip 等展示) */
  cycles: string[][]
}

/**
 * 检测模块依赖图中的所有循环依赖
 * 使用 DFS + 路径回溯，收集所有环上的节点和边
 */
export function detectCircularDeps(modules: readonly ModuleInfo[]): CircularResult {
  const adj = new Map<string, string[]>()
  const idSet = new Set<string>()

  for (const mod of modules) {
    idSet.add(mod.id)
    adj.set(mod.id, mod.deps.filter(d => idSet.has(d) || modules.some(m => m.id === d)))
  }

  // 优化：建完整邻接表后再过滤
  for (const mod of modules) {
    adj.set(mod.id, mod.deps.filter(d => adj.has(d)))
  }

  const circularNodes = new Set<string>()
  const circularEdges = new Set<string>()
  const cycles: string[][] = []

  // 0=未访问, 1=栈中, 2=已完成
  const state = new Map<string, number>()
  const path: string[] = []

  function dfs(node: string) {
    state.set(node, 1)
    path.push(node)

    for (const dep of adj.get(node) || []) {
      const depState = state.get(dep) ?? 0
      if (depState === 1) {
        // 发现环！从 path 中找到环的起点
        const cycleStart = path.indexOf(dep)
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart)
          cycles.push([...cycle])
          // 标记环上所有节点和边
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

/** 辅助：生成 edge key */
export function edgeKey(from: string, to: string): string {
  return `${from}\0${to}`
}
