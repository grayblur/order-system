import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../App.vue'),
      meta: { title: '花馍订单系统' }
    },
      {
      path: '/print/:date?',
      name: 'Print',
      component: () => import('../views/PrintPreview.vue'),
      meta: { title: '打印预览' }
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || '花馍订单管理系统'
  next()
})

export default router