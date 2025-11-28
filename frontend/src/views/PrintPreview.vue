<template>
  <div class="print-preview">
    <div class="print-header">
      <h1>花馍订单生产清单</h1>
      <div class="date-info">
        <span>配送日期：{{ currentDate }}</span>
        <span>打印时间：{{ currentTime }}</span>
      </div>
    </div>

    <div class="orders-container">
      <div v-for="order in ordersForDate" :key="order.id" class="order-card">
        <div class="order-header">
          <h3>{{ order.customerInfo.name }}</h3>
          <div class="contact-info">
            <span>电话：{{ order.customerInfo.phone }}</span>
            <span>地址：{{ order.customerInfo.address }}</span>
          </div>
          <div class="delivery-info">
            <span>配送日期：{{ formatDate(order.customerInfo.deliveryDate) }}</span>
            <el-tag :type="getPaymentStatusType(order.paymentStatus)">
              {{ getPaymentStatusText(order) }}
            </el-tag>
          </div>
          <div v-if="order.customerInfo.notes" class="notes">
            备注：{{ order.customerInfo.notes }}
          </div>
        </div>

        <el-table :data="order.items" class="items-table" size="small">
          <el-table-column prop="name" label="商品名称" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column label="小计" width="100">
            <template #default="scope">¥{{ scope.row.price * scope.row.quantity }}</template>
          </el-table-column>
        </el-table>

        <div class="order-summary">
          <div class="summary-row">
            <span>商品数量：{{ order.items.length }} 件</span>
            <span>总金额：¥{{ order.totalAmount }}</span>
          </div>
          <div class="summary-row">
            <span>已付款：¥{{ order.paidAmount }}</span>
            <span>待付款：¥{{ order.totalAmount - order.paidAmount }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="ordersForDate.length === 0" class="no-orders">
      <p>{{ selectedDate }} 没有订单</p>
    </div>

    <div class="print-actions">
      <el-button @click="$router.go(-1)">返回</el-button>
      <el-button type="primary" @click="print">打印</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'

const route = useRoute()

// 模拟订单数据
const orders = ref([
  {
    id: 1,
    customerInfo: {
      name: '张三',
      phone: '13800138000',
      address: '北京市朝阳区xxx街道',
      deliveryDate: '2024-01-15',
      notes: '请提前1小时联系'
    },
    items: [
      { id: 1, name: '上头糕', price: 168, quantity: 2 },
      { id: 2, name: '剃头糕', price: 128, quantity: 1 }
    ],
    totalAmount: 464,
    paidAmount: 200,
    paymentStatus: 'partial'
  },
  {
    id: 2,
    customerInfo: {
      name: '李四',
      phone: '13900139000',
      address: '北京市海淀区xxx街道',
      deliveryDate: '2024-01-15',
      notes: ''
    },
    items: [
      { id: 3, name: '订婚糕', price: 98, quantity: 3 }
    ],
    totalAmount: 294,
    paidAmount: 294,
    paymentStatus: 'paid'
  }
])

const selectedDate = computed(() => {
  const dateParam = route.params.date
  return dateParam || dayjs().format('YYYY-MM-DD')
})

const currentDate = computed(() => {
  return dayjs(selectedDate.value).format('YYYY年MM月DD日')
})

const currentTime = computed(() => {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
})

const ordersForDate = computed(() => {
  return orders.value.filter(order =>
    dayjs(order.customerInfo.deliveryDate).format('YYYY-MM-DD') === selectedDate.value
  )
})

const formatDate = (date) => {
  return dayjs(date).format('MM-DD')
}

const getPaymentStatusType = (status) => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'warning'
    default:
      return 'danger'
  }
}

const getPaymentStatusText = (order) => {
  const remaining = order.totalAmount - order.paidAmount
  if (remaining <= 0) return '已付清'
  if (order.paidAmount > 0) return '部分付款'
  return '未付款'
}

const print = () => {
  window.print()
}

onMounted(() => {
  // 这里应该从API加载指定日期的订单数据
})
</script>

<style scoped>
.print-preview {
  padding: 20px;
  background-color: white;
  min-height: 100vh;
}

.print-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #333;
}

.print-header h1 {
  margin-bottom: 15px;
  color: var(--primary-color);
  font-size: 24px;
}

.date-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
}

.orders-container {
  margin-bottom: 30px;
}

.order-card {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  page-break-inside: avoid;
}

.order-header {
  margin-bottom: 15px;
}

.order-header h3 {
  margin-bottom: 10px;
  color: #333;
  font-size: 18px;
}

.contact-info,
.delivery-info {
  display: flex;
  gap: 20px;
  margin-bottom: 8px;
  font-size: 14px;
}

.contact-info span,
.delivery-info span {
  color: #666;
}

.notes {
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #fff9c4;
  border-radius: 4px;
  font-size: 14px;
  color: #f57c00;
}

.items-table {
  margin: 15px 0;
}

.order-summary {
  margin-top: 15px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 14px;
}

.no-orders {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
}

.print-actions {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
}

/* 打印样式 */
@media print {
  .print-actions {
    display: none;
  }

  .print-preview {
    padding: 10px;
  }

  .order-card {
    border: 1px solid #ccc;
    box-shadow: none;
    margin-bottom: 20px;
  }

  .print-header h1 {
    font-size: 20px;
  }

  @page {
    margin: 1cm;
  }
}
</style>