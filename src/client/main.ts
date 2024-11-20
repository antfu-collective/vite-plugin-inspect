import routes from 'virtual:generated-pages'
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'

import '@unocss/reset/tailwind.css'
import './styles/main.css'
import './styles/cm.css'
import 'uno.css'

const app = createApp(App)
app.use(createRouter({
  history: createWebHashHistory(),
  routes,
}))
app.mount('#app')
