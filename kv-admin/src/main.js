import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { tokenStore } from './lib/tokenStore'
import './style.css'
import App from './App.vue'



const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard for authentication
router.beforeEach((to, _from, next) => {
  const requiresAuth = to.meta?.requiresAuth
  const activeToken = tokenStore.getActiveToken()

  if (requiresAuth && !activeToken) {
    next({ path: '/' })
  } else {
    next()
  }
})

createApp(App).use(router).mount('#app')
