import { createHotContext } from 'vite-hot-client'

const hotContext = createHotContext()

export async function getHot() {
  return await hotContext
}
