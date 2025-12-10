<template>
  <div class="app-container">
    <!-- 顶部标题 -->
    <header class="main-header">
      <div class="header-left">
        <h1>🌺 花馍订单管理系统</h1>
        <span class="sub-title">生产/订单录入</span>
      </div>
      <div class="header-right">
        <el-button type="success" @click="handleOpenGoodsManager">
          <el-icon><Setting /></el-icon>
          商品管理
        </el-button>
        <el-button type="primary" @click="resetForm">
          <el-icon><Delete /></el-icon>
          清除数据
        </el-button>
        <el-button type="primary" @click="handleShowOrders">
          <el-icon><View /></el-icon>
          查看所有订单
        </el-button>
      </div>
    </header>

    <main class="main-content">
      <!-- 上方区域：客户信息 + 商品选择 -->
      <div class="top-section">

        <!-- 1. 客户信息区块 -->
        <el-card class="box-card section-customer" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><User /></el-icon>
              <span>客户信息</span>
            </div>
          </template>

          <el-form
            ref="customerFormRef"
            :model="form"
            :rules="formRules"
            label-width="85px"
            label-position="left"
            :validate-on-rule-change="false"
            :hide-required-asterisk="false"
          >
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item
                    label="姓名/地址"
                    required
                    prop="nameOrAddress"
                    :show-message="true"
                    :inline-message="false"
                  >
                  <el-input
                    v-model="form.nameOrAddress"
                    placeholder="请输入客户姓名或配送地址"
                    @blur="validateNameOrAddress"
                    @input="validateNameOrAddress"
                  />
                </el-form-item>

                <!-- 快捷输入 -->
                <el-form-item>
                  <div class="quick-inputs-container">
                    <div class="quick-inputs-header">
                      <span>快捷输入：</span>
                      <el-button
                        type="text"
                        size="small"
                        @click="showAddQuickInput"
                        style="margin-left: 10px"
                      >
                        <el-icon><Plus /></el-icon>
                        添加
                      </el-button>
                    </div>
                    <div class="quick-inputs-list" v-if="quickInputs.length > 0">
                      <el-tag
                        v-for="input in quickInputs"
                        :key="input.id"
                        type="info"
                        size="small"
                        class="quick-input-tag"
                        @click="applyQuickInput(input.content)"
                      >
                        {{ input.content }}
                        <el-button
                          type="text"
                          size="small"
                          @click.stop="deleteQuickInput(input.id)"
                          style="margin-left: 5px; padding: 0;"
                        >
                          <el-icon><Close /></el-icon>
                        </el-button>
                      </el-tag>
                    </div>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item
                    label="联系电话"
                    required
                    prop="phone"
                    :show-message="true"
                    :inline-message="false"
                  >
                  <el-input
                    v-model="form.phone"
                    placeholder="11位手机号"
                    @blur="validatePhone"
                    clearable
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="制作日期">
                  <el-date-picker
                    v-model="form.date"
                    type="date"
                    placeholder="选择日期"
                    style="width: 100%"
                    :disabled-date="disabledDate"
                    :picker-options="pickerOptions"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="备注信息">
              <el-input
                v-model="form.notes"
                type="textarea"
                :rows="2"
                placeholder="填写特殊需求..."
              />
            </el-form-item>

            <!-- 备注快捷输入 -->
            <el-form-item>
              <div class="quick-inputs-container">
                <div class="quick-inputs-header">
                  <span>备注快捷输入：</span>
                  <el-button
                    type="text"
                    size="small"
                    @click="showAddNotesQuickInput"
                    style="margin-left: 10px"
                  >
                    <el-icon><Plus /></el-icon>
                    添加
                  </el-button>
                </div>
                <div class="quick-inputs-list" v-if="notesQuickInputs.length > 0">
                  <el-tag
                    v-for="input in notesQuickInputs"
                    :key="input.id"
                    type="warning"
                    size="small"
                    class="quick-input-tag"
                    @click="applyNotesQuickInput(input.content)"
                  >
                    {{ input.content }}
                    <el-button
                      type="text"
                      size="small"
                      @click.stop="deleteNotesQuickInput(input.id)"
                      style="margin-left: 5px; padding: 0;"
                    >
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </el-tag>
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 2. 商品选择区块 (树形) -->
        <el-card class="box-card section-goods" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Goods /></el-icon>
              <span>商品选择</span>
              <el-input
                v-model="searchQuery"
                placeholder="搜索商品..."
                prefix-icon="Search"
                class="search-input"
                size="small"
              />
            </div>
          </template>

          <div class="goods-tree-container">
            <!-- 模拟根据 goods.json 转换后的树形结构 -->
            <el-tree
              :data="goodsData"
              :props="defaultProps"
              node-key="id"
              default-expand-all
              :expand-on-click-node="false"
            >
              <template #default="{ node, data }">
                <div class="custom-tree-node" @click="handleNodeClick(data)">
                  <div class="node-label">
                    <!-- 如果是叶子节点（商品），显示复选框 -->
                    <el-checkbox
                      v-if="data.isItem"
                      v-model="data.selected"
                      @change="handleCheckChange(data)"
                      @click.stop
                    />
                    <span class="label-text" :class="{ 'is-category': !data.isItem, 'clickable': data.isItem }">{{ node.label }}</span>

                    <!-- 价格标签 -->
                    <el-tag v-if="data.isItem" size="small" type="danger" effect="plain" class="price-tag">
                      ¥{{ data.price }}
                    </el-tag>
                    <span v-if="data.unit" class="unit-text">{{ data.unit }}</span>
                  </div>

                  <!-- 数量控制器 (仅选中且是商品时显示) -->
                  <div class="node-actions" v-if="data.isItem && data.selected">
                     <el-input-number
                        v-model="data.quantity"
                        :min="1"
                        size="small"
                        controls-position="right"
                        @click.stop
                      />
                  </div>
                </div>
              </template>
            </el-tree>
          </div>
        </el-card>
      </div>

      <!-- 下方区域：订单汇总 -->
      <div class="bottom-section">
        <el-card class="box-card order-summary" shadow="always">
          <template #header>
            <div class="card-header summary-header">
              <span>订单汇总</span>
              <el-tag :type="isPaid ? 'success' : 'warning'" effect="dark">
                {{ isPaid ? '已结清' : '未结清' }}
              </el-tag>
            </div>
          </template>

          <!-- 空状态 -->
          <el-empty v-if="selectedItems.length === 0" description="暂无选择商品" :image-size="80" />

          <!-- 商品列表 -->
          <div v-else class="summary-list">
            <div v-for="item in selectedItems" :key="item.id" class="summary-item">
              <div class="item-info">
                <div class="item-name">{{ item.category }}-{{ item.productCategory }}-{{ item.label }}</div>
                <div class="item-calc text-secondary">
                  ¥{{ item.price }} × {{ item.quantity }}
                </div>
              </div>
              <div class="item-total">
                ¥{{ item.price * item.quantity }}
                <el-button type="danger" link size="small" @click="item.selected = false">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <!-- 底部合计与操作 -->
          <div class="summary-footer">
            <div class="total-row">
              <span>商品总计:</span>
              <span class="total-price">¥{{ totalPrice }}</span>
            </div>

            <div class="payment-check">
              <el-checkbox v-model="isPaid">已结清账目</el-checkbox>
            </div>

            <div class="action-buttons">
              <el-button plain class="print-btn" @click="handlePrint">
                  <el-icon><Printer /></el-icon>
                  打印清单
                </el-button>
                <el-button type="primary" class="submit-btn" @click="submitOrder">
                  <el-icon><Check /></el-icon>
                  提交订单
                </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </main>

    <!-- 订单列表对话框 -->
    <el-dialog
      v-model="showOrdersDialog"
      title="所有订单"
      width="80%"
      :before-close="handleCloseOrders"
    >
      <div class="orders-content">
        <!-- 日期筛选 -->
        <div class="date-filter">
          <el-date-picker
            v-model="selectedDate"
            type="date"
            placeholder="选择日期查看订单"
            @change="filterOrdersByDate"
            style="width: 200px;"
          />
          <el-button @click="clearDateFilter" style="margin-left: 10px;">
            清空筛选
          </el-button>
        </div>

        <!-- 订单列表 -->
        <div class="orders-list" v-if="filteredOrders.length > 0">
          <el-table :data="filteredOrders" stripe style="width: 100%">
            <el-table-column prop="customerName" label="客户姓名" width="120" />
            <el-table-column prop="phone" label="联系电话" width="130" />
            <el-table-column prop="deliveryDate" label="制作日期" width="150">
              <template #default="scope">
                <el-date-picker
                  v-model="scope.row.deliveryDate"
                  type="date"
                  placeholder="选择日期"
                  size="small"
                  style="width: 130px"
                  @change="handleDateChange(scope.row)"
                  :disabled-date="disabledDate"
                />
              </template>
            </el-table-column>
            <el-table-column prop="items" label="订购商品" min-width="200">
              <template #default="scope">
                <div v-for="item in scope.row.items" :key="item.id" class="order-item">
                  {{ item.category }}-{{ item.productCategory }}, {{ item.label }} x{{ item.quantity }} (¥{{ item.price * item.quantity }})
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="totalPrice" label="总价" width="100">
              <template #default="scope">
                <span class="price-text">¥{{ scope.row.totalPrice }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="isPaid" label="付款状态" width="100">
              <template #default="scope">
                <el-tag
                  :type="scope.row.isPaid ? 'success' : 'warning'"
                  style="cursor: pointer;"
                  @click="togglePaymentStatus(scope.row)"
                >
                  {{ scope.row.isPaid ? '已结清' : '未结清' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="notes" label="备注" min-width="200">
              <template #default="scope">
                <el-input
                  v-model="scope.row.notes"
                  type="text"
                  placeholder="点击编辑备注"
                  size="small"
                  @blur="handleNotesChange(scope.row)"
                  @keyup.enter="handleNotesChange(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button size="small" type="danger" @click="deleteOrder(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页组件 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="pagination.page"
              :page-size="pagination.limit"
              :total="pagination.total"
              layout="total, prev, pager, next"
              @current-change="handlePageChange"
            />
          </div>
        </div>

        <!-- 空状态 -->
        <el-empty v-else description="暂无订单数据" :image-size="100" />
      </div>
    </el-dialog>

    <!-- 打印清单弹窗 -->
    <PrintDialog
      v-model="showPrintDialog"
      @confirm-print="handlePrintConfirm"
    />

    <!-- 商品管理组件 -->
    <GoodsManager ref="goodsManagerRef" />

    <!-- 添加姓名快捷输入对话框 -->
    <el-dialog
      v-model="showAddQuickInputDialog"
      title="添加姓名快捷输入"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="quickInputForm" label-width="80px">
        <el-form-item label="内容">
          <el-input
            v-model="quickInputForm.content"
            placeholder="请输入快捷输入内容"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddQuickInputDialog = false">取消</el-button>
          <el-button type="primary" @click="addQuickInput" :loading="addingQuickInput">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加备注快捷输入对话框 -->
    <el-dialog
      v-model="showAddNotesQuickInputDialog"
      title="添加备注快捷输入"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="notesQuickInputForm" label-width="80px">
        <el-form-item label="内容">
          <el-input
            v-model="notesQuickInputForm.content"
            placeholder="请输入备注快捷输入内容"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddNotesQuickInputDialog = false">取消</el-button>
          <el-button type="primary" @click="addNotesQuickInput" :loading="addingNotesQuickInput">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, nextTick, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Goods, Search, Printer, Check, Delete, View, Setting, Plus, Close } from '@element-plus/icons-vue'
import PrintDialog from './components/PrintDialog.vue'
import GoodsManager from './components/GoodsManager.vue'
import dayjs from 'dayjs'

const customerFormRef = ref()
const goodsManagerRef = ref()

// 快捷输入相关数据
const quickInputs = ref([])
const showAddQuickInputDialog = ref(false)
const quickInputForm = reactive({
  content: ''
})
const addingQuickInput = ref(false)

// 备注快捷输入相关数据
const notesQuickInputs = ref([])
const showAddNotesQuickInputDialog = ref(false)
const notesQuickInputForm = reactive({
  content: ''
})
const addingNotesQuickInput = ref(false)

// 打开商品管理器
const handleOpenGoodsManager = () => {
  goodsManagerRef.value?.open()
}

// --- 持久化存储工具函数 ---
const STORAGE_KEY = 'order-form-data'

// 保存数据到localStorage
const saveToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('保存数据到localStorage失败:', error)
  }
}

// 从localStorage加载数据
const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.warn('从localStorage加载数据失败:', error)
    return null
  }
}

// 清除localStorage数据
const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('清除localStorage数据失败:', error)
  }
}

// --- 1. 客户表单数据 ---
const form = reactive({
  nameOrAddress: '',
  phone: '',
  date: new Date(),
  notes: ''
})

// 手机号码正则表达式（支持中国大陆手机号码格式）
// 支持: 13[0-9], 14[5,7,9], 15[0-3,5-9], 16[6], 17[0-8], 18[0-9], 19[8,9]
const phoneRegex = /^1(3[0-9]|4[579]|5[0-35-9]|6[67]|7[0-8]|8[0-9]|9[89])\d{8}$/

// 清理电话号码格式
const cleanPhoneNumber = (phone) => {
  return phone.replace(/[\s-]/g, '')
}

// 表单验证规则
const formRules = reactive({
  nameOrAddress: [
    { required: true, message: '请输入客户姓名或地址', trigger: 'blur' },
    { min: 2, max: 50, message: '长度应在 2 到 50 个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        console.log('Phone validator triggered with value:', value)
        if (!value) {
          callback(new Error('请输入联系电话'))
        } else {
          const cleanPhone = cleanPhoneNumber(value)
          console.log('Cleaned phone:', cleanPhone)

          // 使用正则表达式进行完整验证
          if (!phoneRegex.test(cleanPhone)) {
            if (cleanPhone.length !== 11) {
              callback(new Error(`手机号码长度应为11位，当前为${cleanPhone.length}位`))
            } else if (cleanPhone[0] !== '1') {
              callback(new Error('手机号码必须以1开头'))
            } else if (!/^[3-9]$/.test(cleanPhone[1])) {
              callback(new Error('手机号码第二位应为3-9之间的数字'))
            } else {
              callback(new Error('请输入正确的手机号码格式（支持11位中国大陆手机号）'))
            }
          } else {
            // 自动清理格式并更新表单值
            form.phone = cleanPhone
            callback()
          }
        }
      },
      trigger: ['blur', 'change']
    }
  ]
})

// 手动验证电话号码的方法
const validatePhone = () => {
  const phoneValue = form.phone
  console.log('Manual validation triggered with value:', phoneValue)

  if (phoneValue) {
    const cleanPhone = cleanPhoneNumber(phoneValue)
    console.log('Cleaned phone:', cleanPhone)

    // 使用正则表达式进行验证
    if (phoneRegex.test(cleanPhone)) {
      console.log('✅ 电话号码验证通过')
      form.phone = cleanPhone
    } else {
      console.error('❌ 电话号码验证失败')
      // 清理格式但仍保留原值，让Element Plus处理验证显示
      if (cleanPhone.length !== 11) {
        console.error('手机号码长度应为11位，当前为' + cleanPhone.length + '位')
      } else if (cleanPhone[0] !== '1') {
        console.error('手机号码必须以1开头')
      } else if (!/^[3-9]$/.test(cleanPhone[1])) {
        console.error('手机号码第二位应为3-9之间的数字')
      } else {
        console.error('请输入正确的手机号码格式（支持11位中国大陆手机号）')
      }
    }
  }

  // 触发表单验证显示气泡提示
  nextTick(() => {
    customerFormRef.value?.validateField('phone')
  })
}

// 手动验证姓名/地址字段
const validateNameOrAddress = () => {
  const value = form.nameOrAddress
  console.log('Name/address validation:', value)

  // 触发表单验证显示气泡提示
  nextTick(() => {
    customerFormRef.value?.validateField('nameOrAddress')
  })
}

// 日期验证：今天之前的日期不可选
const disabledDate = (time) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // 重置到今天的开始
  const selectedDate = new Date(time)
  selectedDate.setHours(0, 0, 0, 0) // 重置到选择日期的开始

  // 禁用今天之前的日期
  return selectedDate < today
}

// 日期选择器选项
const pickerOptions = {
  shortcuts: [
    {
      text: '今天',
      onClick(picker) {
        picker.$emit('pick', new Date())
      }
    },
    {
      text: '明天',
      onClick(picker) {
        const date = new Date()
        date.setTime(date.getTime() + 3600 * 1000 * 24)
        picker.$emit('pick', date)
      }
    },
    {
      text: '一周后',
      onClick(picker) {
        const date = new Date()
        date.setTime(date.getTime() + 3600 * 1000 * 24 * 7)
        picker.$emit('pick', date)
      }
    }
  ]
}

const searchQuery = ref('')
const isPaid = ref(false)

// 搜索商品功能
const searchGoods = (query) => {
  if (!query.trim()) {
    // 如果搜索为空，恢复原始数据
    if (originalGoodsData.value) {
      goodsData.splice(0, goodsData.length, ...JSON.parse(JSON.stringify(originalGoodsData.value)))
    }
    return
  }

  const lowerQuery = query.toLowerCase()
  const filterNodes = (nodes) => {
    const result = []

    nodes.forEach(node => {
      if (node.isItem) {
        // 商品节点：检查名称是否匹配
        if (node.label.toLowerCase().includes(lowerQuery)) {
          result.push(node)
        }
      } else {
        // 分类节点：递归过滤子节点
        const filteredChildren = filterNodes(node.children || [])
        if (filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren
          })
        }
      }
    })

    return result
  }

  const filteredData = filterNodes(originalGoodsData.value || [])
  goodsData.splice(0, goodsData.length, ...filteredData)
}

// 监听搜索输入
watch(searchQuery, (newQuery) => {
  searchGoods(newQuery)
})

// --- 订单管理数据 ---
const showOrdersDialog = ref(false)
const showPrintDialog = ref(false)
const selectedDate = ref(null)

// 订单数据
const orders = ref([])

// 原始订单数据快照，用于比较变化
const originalOrdersSnapshot = ref([])

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 15,
  total: 0
})

// 加载订单数据
const loadOrders = async (page = 1) => {
  try {
    // 构建查询参数
    let url = `/api/orders?page=${page}&limit=${pagination.limit}`

    // 如果有日期筛选，添加日期参数
    if (selectedDate.value) {
      const year = selectedDate.value.getFullYear()
      const month = String(selectedDate.value.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.value.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      url += `&date=${dateStr}`
    }

    const response = await fetch(url)
    const result = await response.json()

    if (result.success) {
      // 转换API数据格式为前端期望的格式
      const transformedOrders = result.data.map(order => ({
        id: order.id,
        customerName: order.customer_name,
        phone: order.customer_phone,
        deliveryDate: new Date(order.delivery_date), // 转换为Date对象以便日期选择器使用
        items: order.items ? order.items.map(item => ({
          id: item.id,
          category: item.category,
          productCategory: item.product_category,
          label: item.product_name,
          quantity: item.quantity,
          price: item.unit_price
        })) : [],
        totalPrice: order.total_amount,
        isPaid: order.payment_status === '已支付',
        notes: order.notes,
        itemCount: order.item_count
      }))

      orders.value = transformedOrders
      // 创建数据快照用于比较变化
      originalOrdersSnapshot.value = JSON.parse(JSON.stringify(transformedOrders))

      // 更新分页信息
      if (result.pagination) {
        pagination.page = result.pagination.page
        pagination.total = result.pagination.total
      }
    } else {
      ElMessage.error('加载订单失败')
    }
  } catch (error) {
    console.error('加载订单失败:', error)
    ElMessage.error('网络错误，无法加载订单')
  }
}

// 分页切换
const handlePageChange = (page) => {
  loadOrders(page)
}

// 根据日期筛选的订单（分页后直接使用 orders 数据）
const filteredOrders = computed(() => {
  return orders.value
})

// --- 2. 商品数据 (从后端API动态加载) ---
const goodsData = reactive([])
const originalGoodsData = ref(null) // 保存原始数据用于搜索重置

const defaultProps = {
  children: 'children',
  label: 'label',
}

// --- 3. 商品数据加载和处理 ---
// 将后端API数据转换为前端树形结构
const convertGoodsDataToTree = (apiData) => {
  const result = []
  let nodeId = 1

  Object.keys(apiData).forEach(categoryName => {
    const categoryData = apiData[categoryName]
    const categoryNode = {
      id: `c_${nodeId++}`,
      label: categoryName,
      isItem: false,
      children: []
    }

    Object.keys(categoryData).forEach(subcategoryName => {
      const subcategoryItems = categoryData[subcategoryName]
      const subcategoryNode = {
        id: `sc_${nodeId++}`,
        label: subcategoryName,
        isItem: false,
        children: []
      }

      // 处理商品列表，按第三层分类分组
      const productGroups = {}

      subcategoryItems.forEach(product => {
        const thirdLevelCategory = product.category || '其他'

        if (!productGroups[thirdLevelCategory]) {
          productGroups[thirdLevelCategory] = []
        }

        productGroups[thirdLevelCategory].push({
          id: `p_${nodeId++}`,
          label: product.name,
          price: product.price,
          isItem: true,
          selected: false,
          quantity: 1,
          unit: product.unit,
          category: categoryName, // 第一层分类
          subcategory: subcategoryName, // 第二层分类
          productCategory: thirdLevelCategory // 第三层分类
        })
      })

      // 将分组后的商品转换为树节点
      Object.keys(productGroups).forEach(thirdLevelName => {
        const thirdLevelNode = {
          id: `tl_${nodeId++}`,
          label: thirdLevelName,
          isItem: false,
          children: productGroups[thirdLevelName]
        }
        subcategoryNode.children.push(thirdLevelNode)
      })

      categoryNode.children.push(subcategoryNode)
    })

    result.push(categoryNode)
  })

  return result
}

// 加载商品数据
const loadGoodsData = async () => {
  try {
    const response = await fetch('/api/goods')
    const result = await response.json()

    if (result.success && result.data) {
      const treeData = convertGoodsDataToTree(result.data)
      goodsData.splice(0, goodsData.length, ...treeData)
      originalGoodsData.value = JSON.parse(JSON.stringify(treeData))
      console.log('✅ 商品数据加载成功:', treeData)
    } else {
      ElMessage.error('加载商品数据失败')
      console.error('商品数据API返回错误:', result)
    }
  } catch (error) {
    console.error('加载商品数据失败:', error)
    ElMessage.error('网络错误，无法加载商品数据')
  }
}

// --- 4. 计算属性：获取所有被选中的商品 ---
// 简单的递归查找，用于UI展示
const getSelectedNodes = (nodes) => {
  let result = []
  nodes.forEach(node => {
    if (node.isItem && node.selected) {
      result.push(node)
    }
    if (node.children) {
      result = result.concat(getSelectedNodes(node.children))
    }
  })
  return result
}

const selectedItems = computed(() => getSelectedNodes(goodsData))

// --- 5. 计算属性：总价 ---
const totalPrice = computed(() => {
  return selectedItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

// --- 6. 交互方法 (仅UI效果) ---
const handleCheckChange = (data) => {
  // 如果取消勾选，重置数量为1
  if (!data.selected) {
    data.quantity = 1
  }
}

// 处理节点点击事件
const handleNodeClick = (data) => {
  // 只有商品（叶子节点）才响应点击
  if (data.isItem) {
    data.selected = !data.selected
    if (!data.selected) {
      data.quantity = 1
    }
  }
}

// --- 7. 订单管理方法 ---
const filterOrdersByDate = () => {
  // 日期变化时重新加载数据（从第一页开始）
  pagination.page = 1
  loadOrders(1)
}

const clearDateFilter = () => {
  selectedDate.value = null
  // 清空筛选后重新加载数据（从第一页开始）
  pagination.page = 1
  loadOrders(1)
}

const handleShowOrders = async () => {
  // 点击查看订单时才加载数据
  await loadOrders()
  showOrdersDialog.value = true
}

const handleCloseOrders = () => {
  showOrdersDialog.value = false
}

// 删除订单
const deleteOrder = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除客户 "${order.customerName}" 的订单吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await fetch(`/api/orders/${order.id}`, {
      method: 'DELETE'
    })
    const result = await response.json()

    if (result.success) {
      ElMessage.success('订单删除成功')
      loadOrders() // 重新加载订单列表
    } else {
      ElMessage.error(result.error || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除订单失败:', error)
      ElMessage.error('网络错误，删除失败')
    }
  }
}

// 处理制作日期修改
const handleDateChange = async (order) => {
  try {
    // 从快照中找到对应的原始订单数据
    const originalOrder = originalOrdersSnapshot.value.find(o => o.id === order.id)
    if (!originalOrder) {
      ElMessage.error('找不到订单数据')
      return
    }

    // 将新日期和原始日期都格式化为 YYYY-MM-DD 进行比较
    const formattedNewDate = (() => {
      if (typeof order.deliveryDate === 'string') {
        return order.deliveryDate
      }
      const year = order.deliveryDate.getFullYear()
      const month = String(order.deliveryDate.getMonth() + 1).padStart(2, '0')
      const day = String(order.deliveryDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })()

    const formattedOriginalDate = (() => {
      if (typeof originalOrder.deliveryDate === 'string') {
        return originalOrder.deliveryDate
      }
      const year = originalOrder.deliveryDate.getFullYear()
      const month = String(originalOrder.deliveryDate.getMonth() + 1).padStart(2, '0')
      const day = String(originalOrder.deliveryDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })()

    // 如果日期没有变化，则不执行更新
    if (formattedNewDate === formattedOriginalDate) {
      return
    }

    // 显示确认对话框，显示日期变化
    await ElMessageBox.confirm(
      `确定要将客户 "${order.customerName}" 的制作日期从 "${formattedOriginalDate}" 改为 "${formattedNewDate}" 吗？`,
      '修改制作日期',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: order.customerName,
        customer_address: order.customerName,
        customer_phone: order.phone,
        delivery_date: formattedNewDate,
        notes: order.notes,
        paid_amount: order.isPaid ? order.totalPrice : 0,
        payment_status: order.isPaid ? '已支付' : '未支付'
      })
    })
    const result = await response.json()

    if (result.success) {
      ElMessage.success('制作日期已更新')
      // 重新加载订单数据以确保数据同步
      loadOrders()
    } else {
      ElMessage.error(result.error || '更新制作日期失败')
      // 如果更新失败，重新加载数据以恢复原值
      loadOrders()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新制作日期失败:', error)
      ElMessage.error('网络错误，更新制作日期失败')
      loadOrders()
    } else {
      // 用户取消操作，恢复原始日期显示
      const originalOrder = originalOrdersSnapshot.value.find(o => o.id === order.id)
      if (originalOrder) {
        // 使用 nextTick 确保 DOM 更新
        nextTick(() => {
          order.deliveryDate = new Date(originalOrder.deliveryDate)
        })
      }
    }
  }
}

// 处理备注修改
const handleNotesChange = async (order) => {
  try {
    // 从快照中找到对应的原始订单数据
    const originalOrder = originalOrdersSnapshot.value.find(o => o.id === order.id)
    const originalNotes = originalOrder ? (originalOrder.notes || '') : ''

    // 如果备注没有变化，则不执行更新
    if (originalNotes === order.notes) {
      return
    }

    // 显示确认对话框，显示新旧备注对比
    await ElMessageBox.confirm(
      `确定要修改客户 "${order.customerName}" 的备注吗？\n\n原备注：${originalNotes || '（无）'}\n新备注：${order.notes || '（无）'}`,
      '修改备注',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const formattedDate = (() => {
      if (typeof order.deliveryDate === 'string') {
        return order.deliveryDate
      }
      const year = order.deliveryDate.getFullYear()
      const month = String(order.deliveryDate.getMonth() + 1).padStart(2, '0')
      const day = String(order.deliveryDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })()

    const response = await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: order.customerName,
        customer_address: order.customerName,
        customer_phone: order.phone,
        delivery_date: formattedDate,
        notes: order.notes,
        paid_amount: order.isPaid ? order.totalPrice : 0,
        payment_status: order.isPaid ? '已支付' : '未支付'
      })
    })
    const result = await response.json()

    if (result.success) {
      ElMessage.success('备注已更新')
      // 重新加载订单数据以确保数据同步
      loadOrders()
    } else {
      ElMessage.error(result.error || '更新备注失败')
      // 如果更新失败，重新加载数据以恢复原值
      loadOrders()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新备注失败:', error)
      ElMessage.error('网络错误，更新备注失败')
      loadOrders()
    } else {
      // 用户取消操作，恢复原始备注显示
      const originalOrder = originalOrdersSnapshot.value.find(o => o.id === order.id)
      if (originalOrder) {
        // 使用 nextTick 确保 DOM 更新
        nextTick(() => {
          order.notes = originalOrder.notes || ''
        })
      }
    }
  }
}

// 切换付款状态
const togglePaymentStatus = async (order) => {
  const currentStatus = order.isPaid
  const newStatus = !currentStatus
  const newStatusText = newStatus ? '已结清' : '未结清'
  const currentStatusText = currentStatus ? '已结清' : '未结清'

  try {
    await ElMessageBox.confirm(
      `确定要将客户 "${order.customerName}" 的付款状态从 "${currentStatusText}" 改为 "${newStatusText}" 吗？`,
      '付款状态变更',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 计算新的付款金额和状态
    const newPaidAmount = newStatus ? order.totalPrice : 0
    const newPaymentStatusDb = newStatus ? '已支付' : '未支付'

    const formattedDate = (() => {
      if (typeof order.deliveryDate === 'string') {
        return order.deliveryDate
      }
      const year = order.deliveryDate.getFullYear()
      const month = String(order.deliveryDate.getMonth() + 1).padStart(2, '0')
      const day = String(order.deliveryDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })()

    const response = await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: order.customerName,
        customer_address: order.customerName, // 使用姓名作为地址
        customer_phone: order.phone,
        delivery_date: formattedDate,
        notes: order.notes,
        paid_amount: newPaidAmount,
        payment_status: newPaymentStatusDb
      })
    })
    const result = await response.json()

    if (result.success) {
      ElMessage.success(`付款状态已更新为 "${newStatusText}"`)
      loadOrders() // 重新加载订单列表
    } else {
      ElMessage.error(result.error || '更新失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新付款状态失败:', error)
      ElMessage.error('网络错误，更新失败')
    }
  }
}

// 提交订单的方法
const submitOrder = async () => {
  try {
    // 先进行表单验证
    await customerFormRef.value.validate()

    // 验证订单商品
    if (selectedItems.value.length === 0) {
      ElMessage.error('请至少选择一件商品')
      return
    }

    // 构建订单数据 - 使用本地时间避免时区问题
    const orderData = {
      customerName: form.nameOrAddress,
      phone: form.phone,
      deliveryDate: (() => {
        const year = form.date.getFullYear()
        const month = String(form.date.getMonth() + 1).padStart(2, '0')
        const day = String(form.date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })(),
      items: selectedItems.value.map(item => ({
        id: item.id,
        label: item.label,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        productCategory: item.productCategory
      })),
      totalPrice: totalPrice.value,
      isPaid: isPaid.value,
      notes: form.notes,
      orderTime: new Date().toISOString()
    }

    // 调用API提交订单
    console.log('提交订单数据:', orderData)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: orderData.customerName,
          customer_address: orderData.customerName, // 使用姓名作为地址，因为系统字段设计
          customer_phone: orderData.phone,
          delivery_date: orderData.deliveryDate,
          notes: orderData.notes,
          isPaid: orderData.isPaid,
          items: orderData.items.map(item => ({
            category: item.category || '花馍', // 第一层分类
            subcategory: item.subcategory || '其他', // 第二层分类
            product_category: item.productCategory || '', // 第三层分类
            product_name: item.label, // 第四层商品名称
            quantity: item.quantity,
            unit_price: item.price
          }))
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '订单提交失败')
      }

      // 显示成功消息
      ElMessage.success('订单提交成功！')

      // 重置表单
      resetForm()

    } catch (apiError) {
      console.error('API调用错误:', apiError)
      ElMessage.error(apiError.message || '订单提交失败，请重试')
      throw apiError // 重新抛出错误以便外层catch捕获
    }

  } catch (error) {
    if (error.name === 'ValidateError') {
      ElMessage.error('请填写完整的客户信息')
    } else {
      ElMessage.error('订单提交失败，请重试')
      console.error('提交订单错误:', error)
    }
  }
}

// 打印处理
const handlePrint = () => {
  // 打开打印日期选择弹窗
  showPrintDialog.value = true
}

// 处理打印确认
const handlePrintConfirm = async (selectedDate) => {
  try {
    // 将日期格式化为 YYYY-MM-DD
    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD')

    // 先调用后端API记录打印
    ElMessage.info('正在记录打印操作...')

    const printResponse = await fetch('/api/orders/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        print_date: dateStr,
        print_type: 'production_list',
        notes: '花馍订单生产清单打印'
      })
    })

    const printResult = await printResponse.json()

    if (!printResult.success) {
      ElMessage.error(`打印记录失败: ${printResult.error}`)
      return
    }

    // 打印记录成功后，显示成功消息并打开打印预览
    ElMessage.success(`打印记录成功，共 ${printResult.data.order_count} 个订单`)

    // 跳转到打印预览页面，并传递日期参数
    const printUrl = `/print/${dateStr}`

    // 打开新窗口进行打印预览
    const printWindow = window.open(printUrl, '_blank')

    if (!printWindow) {
      ElMessage.warning('请允许弹出窗口以打印清单')
      return
    }

    ElMessage.success('正在准备打印清单...')

    // 等待页面加载完成后触发打印
    printWindow.addEventListener('load', () => {
      setTimeout(() => {
        printWindow.print()
      }, 500)
    })

  } catch (error) {
    console.error('打印失败:', error)
    ElMessage.error('打印失败，请重试')
  }
}

// 重置表单
const resetForm = () => {
  // 重置客户信息
  form.nameOrAddress = ''
  form.phone = ''
  form.date = new Date()
  form.notes = ''

  // 重置商品选择
  getSelectedNodes(goodsData).forEach(node => {
    node.selected = false
    node.quantity = 1
  })

  // 重置付款状态
  isPaid.value = false

  // 清除本地存储
  clearStorage()

  // 清除表单验证状态
  customerFormRef.value?.resetFields()
}

// 快捷输入相关方法
// 加载快捷输入数据
const loadQuickInputs = async () => {
  try {
    // 加载姓名快捷输入
    const nameResponse = await fetch('/api/quick-inputs?type=name')
    const nameResult = await nameResponse.json()
    if (nameResult.success) {
      quickInputs.value = nameResult.data
    }

    // 加载备注快捷输入
    const notesResponse = await fetch('/api/quick-inputs?type=notes')
    const notesResult = await notesResponse.json()
    if (notesResult.success) {
      notesQuickInputs.value = notesResult.data
    }
  } catch (error) {
    console.error('加载快捷输入失败:', error)
  }
}

// 显示添加快捷输入对话框
const showAddQuickInput = () => {
  quickInputForm.content = ''
  showAddQuickInputDialog.value = true
}

// 添加快捷输入
const addQuickInput = async () => {
  if (!quickInputForm.content.trim()) {
    ElMessage.warning('请输入快捷输入内容')
    return
  }

  addingQuickInput.value = true
  try {
    const response = await fetch('/api/quick-inputs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: quickInputForm.content.trim(),
        type: 'name'
      })
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success(result.message)
      showAddQuickInputDialog.value = false
      quickInputForm.content = ''
      await loadQuickInputs() // 重新加载列表
    } else {
      ElMessage.error(result.error || '添加快捷输入失败')
    }
  } catch (error) {
    console.error('添加快捷输入失败:', error)
    ElMessage.error('添加快捷输入失败')
  } finally {
    addingQuickInput.value = false
  }
}

// 应用快捷输入
const applyQuickInput = (content) => {
  form.nameOrAddress = content
  ElMessage.success('已应用快捷输入')
}

// 删除快捷输入
const deleteQuickInput = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个快捷输入吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await fetch(`/api/quick-inputs/${id}`, {
      method: 'DELETE'
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success(result.message)
      await loadQuickInputs() // 重新加载列表
    } else {
      ElMessage.error(result.error || '删除快捷输入失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除快捷输入失败:', error)
      ElMessage.error('删除快捷输入失败')
    }
  }
}

// 备注快捷输入相关方法
// 显示添加备注快捷输入对话框
const showAddNotesQuickInput = () => {
  notesQuickInputForm.content = ''
  showAddNotesQuickInputDialog.value = true
}

// 添加备注快捷输入
const addNotesQuickInput = async () => {
  if (!notesQuickInputForm.content.trim()) {
    ElMessage.warning('请输入备注快捷输入内容')
    return
  }

  addingNotesQuickInput.value = true
  try {
    const response = await fetch('/api/quick-inputs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: notesQuickInputForm.content.trim(),
        type: 'notes'
      })
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success(result.message)
      showAddNotesQuickInputDialog.value = false
      notesQuickInputForm.content = ''
      await loadQuickInputs() // 重新加载列表
    } else {
      ElMessage.error(result.error || '添加备注快捷输入失败')
    }
  } catch (error) {
    console.error('添加备注快捷输入失败:', error)
    ElMessage.error('添加备注快捷输入失败')
  } finally {
    addingNotesQuickInput.value = false
  }
}

// 应用备注快捷输入
const applyNotesQuickInput = (content) => {
  form.notes = content
  ElMessage.success('已应用备注快捷输入')
}

// 删除备注快捷输入
const deleteNotesQuickInput = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个备注快捷输入吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await fetch(`/api/quick-inputs/${id}`, {
      method: 'DELETE'
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success(result.message)
      await loadQuickInputs() // 重新加载列表
    } else {
      ElMessage.error(result.error || '删除备注快捷输入失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除备注快捷输入失败:', error)
      ElMessage.error('删除备注快捷输入失败')
    }
  }
}

// 恢复商品选择状态
const restoreGoodsSelection = (savedSelectedItems) => {
  if (!savedSelectedItems) return

  // 遍历所有商品节点，恢复选中状态
  const restoreNodes = (nodes) => {
    nodes.forEach(node => {
      if (node.isItem) {
        const savedItem = savedSelectedItems.find(item => item.id === node.id)
        if (savedItem) {
          node.selected = savedItem.selected
          node.quantity = savedItem.quantity || 1
        }
      }
      if (node.children) {
        restoreNodes(node.children)
      }
    })
  }
  restoreNodes(goodsData)
}

// 页面加载时恢复数据
onMounted(async () => {
  // 先加载商品数据
  await loadGoodsData()

  // 加载快捷输入数据
  await loadQuickInputs()

  // 从localStorage恢复数据
  const savedData = loadFromStorage()
  if (savedData) {
    // 恢复表单数据
    if (savedData.form) {
      form.nameOrAddress = savedData.form.nameOrAddress || ''
      form.phone = savedData.form.phone || ''
      form.date = savedData.form.date ? new Date(savedData.form.date) : new Date()
      form.notes = savedData.form.notes || ''
    }

    // 恢复商品选择
    if (savedData.selectedItems) {
      restoreGoodsSelection(savedData.selectedItems)
    }

    // 恢复付款状态
    if (savedData.isPaid !== undefined) {
      isPaid.value = savedData.isPaid
    }
  }
})

// 监听表单和商品选择变化，自动保存
watch(
  [
    () => ({
      nameOrAddress: form.nameOrAddress,
      phone: form.phone,
      date: form.date,
      notes: form.notes
    }),
    () => selectedItems.value.map(item => ({
      id: item.id,
      selected: item.selected,
      quantity: item.quantity
    })),
    () => isPaid.value
  ],
  () => {
    const dataToSave = {
      form: {
        nameOrAddress: form.nameOrAddress,
        phone: form.phone,
        date: form.date,
        notes: form.notes
      },
      selectedItems: selectedItems.value.map(item => ({
        id: item.id,
        selected: item.selected,
        quantity: item.quantity
      })),
      isPaid: isPaid.value,
      timestamp: Date.now()
    }
    saveToStorage(dataToSave)
  },
  { deep: true }
)

</script>

<style scoped lang="scss">
/* 引入 Google Fonts 这里的字体仅作参考，实际可本地化 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap');

:root {
  --primary-color: #E74C3C;
  --secondary-color: #F39C12;
  --background-color: #FFF5F5;
  --text-main: #2C3E50;
  --border-radius: 8px;
}

.app-container {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background-color: #f5f7fa; /* 整体背景淡灰，突出内容 */
  min-height: 100vh;
  padding: 20px;
  color: #2C3E50;
}

/* Header */
.main-header {
  margin-bottom: 24px;
  border-left: 5px solid #E74C3C;
  padding-left: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    align-items: baseline;

    h1 {
      margin: 0;
      font-size: 24px;
      color: #2C3E50;
    }

    .sub-title {
      margin-left: 12px;
      font-size: 14px;
      color: #7F8C8D;
    }
  }

  .header-right {
    .el-button {
      background-color: #E74C3C;
      border-color: #E74C3C;
      margin-right: 10px;

      &:hover {
        background-color: #c0392b;
        border-color: #c0392b;
      }
    }
  }
}

/* Layout */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.top-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bottom-section {
  /* 下方区域不需要特殊设置，直接使用卡片样式 */
}

/* Cards */
.box-card {
  border-radius: 8px;
  border: none;
  
  :deep(.el-card__header) {
    background-color: #fff;
    border-bottom: 1px solid #f0f0f0;
    padding: 15px 20px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
  
  .el-icon {
    margin-right: 8px;
    color: #E74C3C;
  }
}

/* Customer Form */
.section-customer {
  border-top: 3px solid #E74C3C;

  // 确保表单验证错误消息正确显示
  :deep(.el-form-item__error) {
    color: #f56c6c;
    font-size: 12px;
    line-height: 1;
    padding-top: 4px;
    position: absolute;
    top: 100%;
    left: 0;
    background: #fef0f0;
    border: 1px solid #fbc4c4;
    border-radius: 4px;
    padding: 6px 12px;
    z-index: 2024;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

    // 箭头指向输入框
    &::before {
      content: '';
      position: absolute;
      top: -6px;
      left: 20px;
      border-width: 0 6px 6px 6px;
      border-style: solid;
      border-color: transparent transparent #fef0f0 transparent;
    }

    &::after {
      content: '';
      position: absolute;
      top: -5px;
      left: 21px;
      border-width: 0 5px 5px 5px;
      border-style: solid;
      border-color: transparent transparent #fbc4c4 transparent;
    }
  }

  // 输入框错误状态样式
  :deep(.el-input.is-error .el-input__wrapper) {
    box-shadow: 0 0 0 1px #f56c6c inset;
  }

  :deep(.el-form-item.is-error .el-input__wrapper) {
    background-color: #fef0f0;
  }

  // 修复清除按钮样式和交互
  :deep(.el-input__suffix) {
    cursor: pointer;
    pointer-events: auto;
    z-index: 10;
  }

  :deep(.el-input__clear) {
    cursor: pointer;
    pointer-events: auto;
  }
}

/* 快捷输入样式 */
.quick-inputs-container {
  .quick-inputs-header {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
  }

  .quick-inputs-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .quick-input-tag {
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;

      &:hover {
        background-color: var(--primary-color);
        color: white;
        transform: translateY(-1px);
      }

      .el-button {
        &:hover {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
        }
      }
    }
  }
}

/* Goods Tree */
.section-goods {
  .search-input {
    margin-left: auto;
    width: 200px;
  }
}

.goods-tree-container {
  max-height: 600px;
  overflow-y: auto;
  padding-right: 10px;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;
  height: 40px; /* 增加行高方便点击 */
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 4px;

  &:hover {
    background-color: rgba(231, 76, 60, 0.1);
  }

  .node-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .is-category {
    font-weight: bold;
    color: #2c3e50;
    font-size: 15px;

    &:hover {
      color: #E74C3C;
    }
  }

  .clickable {
    transition: color 0.2s ease;

    &:hover {
      color: #E74C3C;
    }
  }

  .price-tag {
    font-weight: bold;
  }

  .unit-text {
    color: #999;
    font-size: 12px;
  }
}

/* Order Summary */
.order-summary {
  border-top: 3px solid #F39C12;
}

.summary-header {
  justify-content: space-between;
}

.summary-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
  border-bottom: 1px dashed #eee;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f9f9f9;
  
  .item-name {
    font-weight: 500;
  }
  
  .text-secondary {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
  
  .item-total {
    font-weight: bold;
    color: #E74C3C;
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.summary-footer {
  background-color: #FFF5F5;
  margin: -20px; /* 抵消 card body padding */
  padding: 20px;
  margin-top: 0;
  
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 15px;
    
    .total-price {
      color: #E74C3C;
      font-size: 24px;
    }
  }
  
  .payment-check {
    margin-bottom: 20px;
    text-align: right;
  }
  
  .action-buttons {
    display: flex;
    gap: 10px;
    
    .print-btn {
      flex: 1;
    }
    .submit-btn {
      flex: 2;
      background-color: #E74C3C;
      border-color: #E74C3C;
      
      &:hover {
        background-color: #c0392b;
        border-color: #c0392b;
      }
    }
  }
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    gap: 15px;
  }

  .app-container {
    padding: 15px;
  }

  .summary-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .item-total {
    align-self: flex-end;
  }
}

/* 订单对话框样式 */
.orders-content {
  .date-filter {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 6px;
    display: flex;
    align-items: center;

    .el-date-editor {
      .el-input__inner {
        border-color: #E74C3C;

        &:focus {
          border-color: #c0392b;
          box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
        }
      }
    }

    .el-button {
      border-color: #E74C3C;
      color: #E74C3C;

      &:hover {
        background-color: #E74C3C;
        color: white;
      }
    }
  }

  .orders-list {
    .el-table {
      border-radius: 8px;
      overflow: hidden;

      .el-table__header {
        background-color: #fafafa;
      }

      .order-item {
        font-size: 13px;
        line-height: 1.4;
        margin-bottom: 4px;
        color: #606266;

        &:last-child {
          margin-bottom: 0;
        }
      }

      .price-text {
        font-weight: bold;
        color: #E74C3C;
        font-size: 15px;
      }

      .el-tag {
        font-weight: 500;
      }
    }

    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: center;

      .el-pagination {
        --el-pagination-button-color: #E74C3C;
        --el-pagination-hover-color: #c0392b;
      }
    }
  }

  .el-empty {
    padding: 40px 0;
  }
}
</style>