import type { QueryEnv } from '../../types'
import type { InspectContext } from '../context'

export function getAllQueryEnvs(ctx: InspectContext): QueryEnv[] {
  const result: QueryEnv[] = []
  for (const vite of ctx._idToInstances.values()) {
    for (const envName of vite.environments.keys()) {
      result.push({ vite: vite.id, env: envName })
    }
  }
  return result
}

export function getAllModuleIds(ctx: InspectContext): [QueryEnv, string][] {
  const result: [QueryEnv, string][] = []
  for (const vite of ctx._idToInstances.values()) {
    for (const [envName, env] of vite.environments) {
      const query: QueryEnv = { vite: vite.id, env: envName }
      for (const id of Object.keys(env.data.transform)) {
        result.push([query, id])
      }
    }
  }
  return result
}
