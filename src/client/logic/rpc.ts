import { createRPCClient } from 'vite-dev-rpc'
import { hot } from 'vite-hot-client'
import type { PRCFunctions } from '../../types'

export const rpc = createRPCClient<PRCFunctions>('vite-plugin-inspect', hot as any)
