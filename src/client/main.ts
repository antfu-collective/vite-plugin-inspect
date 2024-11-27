import { createPinia } from 'pinia'
import routes from 'virtual:generated-pages'
// register vue composition api globally
import { createApp, h, Suspense } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
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
  history: createWebHashHistory(),
  routes,
})
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.mount('#app')
