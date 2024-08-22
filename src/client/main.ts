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

createApp(App).use(FloatingVue).use(createRouter({
  history: createWebHashHistory(),
  routes,
})).mount('#app')
