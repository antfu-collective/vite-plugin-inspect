import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      name: 'home',
      path: '/',
      component: Home,
    },
    {
      name: 'other',
      path: '/other',
      component: () => import('../views/Other.vue'),
    },
    {
      name: 'error',
      path: '/error',
      component: () => import('../views/Error.vue'),
    },
  ],
})

export default router
