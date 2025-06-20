import { createPinia } from 'pinia'
import { createApp, h, Suspense } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'

import '@unocss/reset/tailwind.css'
import './styles/main.css'
import './styles/cm.css'
import 'uno.css'

const app = createApp(() => h(Suspense, {}, {
  default: () => h(App),
  fallback: 'Loading...',
}))
const router = createRouter({
  routes,
  history: createWebHashHistory(),
})
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.mount('#app')
