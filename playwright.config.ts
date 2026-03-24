import process from 'node:process'
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'pnpm -C playground dev',
    env: {
      VITE_DEVTOOLS_DISABLE_CLIENT_AUTH: 'true',
    },
    url: 'http://localhost:5173/.vite-inspect/',
    reuseExistingServer: !process.env.CI,
  },
})
