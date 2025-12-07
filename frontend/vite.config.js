import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    },
    watch: {
      usePolling: false,  // 禁用轮询，减少不必要的文件监听
      interval: 3000  // 如果需要轮询，设置为更长的间隔
    },
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      port: 5173  // 明确指定HMR端口
    }
  },
  // ARM平台构建优化
  build: {
    minify: 'esbuild',  // 比terser更快
    target: 'es2015',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          element: ['element-plus', '@element-plus/icons-vue'],
          utils: ['axios', 'dayjs']
        }
      }
    }
  }
})