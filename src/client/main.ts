// register vue composition api globally
import { Suspense, createApp, h } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia } from 'pinia'
import routes from 'virtual:generated-pages'
import App from './App.vue'

import '@unocss/reset/tailwind.css'
import 'floating-vue/dist/style.css'
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
