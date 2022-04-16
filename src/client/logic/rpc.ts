import { createRPCClient } from 'vite-dev-rpc'
import { hot } from 'vite-hot-client'
import type { RPCFunctions } from '../../types'

export const rpc = createRPCClient<RPCFunctions>('vite-plugin-inspect', hot as any)
