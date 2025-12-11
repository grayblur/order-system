import { ref } from 'vue'

export default {
  install(app) {
    const fontScale = ref(1)

    // 恢复保存的设置
    const saved = localStorage.getItem('fontScale')
    if (saved) {
      fontScale.value = parseFloat(saved)
      document.documentElement.style.setProperty('--font-scale', saved)
    }

    // 全局属性，任何组件都能访问
    app.config.globalProperties.$fontScale = fontScale
    
    app.config.globalProperties.$increaseFontSize = () => {
      fontScale.value = Math.min(fontScale.value + 0.1, 2)
      document.documentElement.style.setProperty('--font-scale', fontScale.value)
      localStorage.setItem('fontScale', fontScale.value)
    }

    app.config.globalProperties.$decreaseFontSize = () => {
      fontScale.value = Math.max(fontScale.value - 0.1, 0.8)
      document.documentElement.style.setProperty('--font-scale', fontScale.value)
      localStorage.setItem('fontScale', fontScale.value)
    }

    app.config.globalProperties.$resetFontSize = () => {
      fontScale.value = 1
      document.documentElement.style.setProperty('--font-scale', 1)
      localStorage.removeItem('fontScale')
    }
  }
}