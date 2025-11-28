import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useOrderStore = defineStore('order', () => {
  // 订单表单数据
  const orderForm = ref({
    customerInfo: {
      name: '',
      phone: '',
      address: '',
      deliveryDate: '',
      notes: ''
    },
    items: [],
    totalAmount: 0,
    paidAmount: 0,
    paymentStatus: 'unpaid' // unpaid, partial, paid
  })

  // 商品目录
  const goodsCatalog = ref(null)

  // 计算属性
  const totalAmount = computed(() => {
    return orderForm.value.items.reduce((total, item) => {
      return total + (item.price * item.quantity)
    }, 0)
  })

  const remainingAmount = computed(() => {
    return totalAmount.value - orderForm.value.paidAmount
  })

  const paymentStatusText = computed(() => {
    if (remainingAmount.value <= 0) return '已付清'
    if (orderForm.value.paidAmount > 0) return '部分付款'
    return '未付款'
  })

  // 方法
  const addItem = (item) => {
    const existingItem = orderForm.value.items.find(i => i.id === item.id)
    if (existingItem) {
      existingItem.quantity += item.quantity || 1
    } else {
      orderForm.value.items.push({
        ...item,
        quantity: item.quantity || 1
      })
    }
  }

  const removeItem = (itemId) => {
    const index = orderForm.value.items.findIndex(item => item.id === itemId)
    if (index > -1) {
      orderForm.value.items.splice(index, 1)
    }
  }

  const updateQuantity = (itemId, quantity) => {
    const item = orderForm.value.items.find(i => i.id === itemId)
    if (item) {
      item.quantity = quantity
    }
  }

  const clearOrder = () => {
    orderForm.value = {
      customerInfo: {
        name: '',
        phone: '',
        address: '',
        deliveryDate: '',
        notes: ''
      },
      items: [],
      totalAmount: 0,
      paidAmount: 0,
      paymentStatus: 'unpaid'
    }
  }

  const loadGoodsCatalog = async () => {
    try {
      // 这里应该从API获取，现在先从静态文件获取
      const response = await fetch('/api/goods')
      goodsCatalog.value = await response.json()
    } catch (error) {
      console.error('加载商品目录失败:', error)
      // 降级方案：使用本地静态数据
      goodsCatalog.value = {}
    }
  }

  return {
    orderForm,
    goodsCatalog,
    totalAmount,
    remainingAmount,
    paymentStatusText,
    addItem,
    removeItem,
    updateQuantity,
    clearOrder,
    loadGoodsCatalog
  }
})