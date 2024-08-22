// register vue composition api globally
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from 'virtual:generated-pages'
import FloatingVue from 'floating-vue'
import App from './App.vue'

import '@unocss/reset/tailwind.css'
import './styles/main.css'
import './styles/cm.css'
import 'uno.css'

const app = createApp(App)
app.use(FloatingVue)
app.use(createRouter({
  history: createWebHashHistory(),
  routes,
}))
app.mount('#app')
