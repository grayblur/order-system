<template>
  <el-dialog
    v-model="dialogVisible"
    title="打印生产清单"
    width="400px"
    :before-close="handleClose"
    align-center
  >
    <div class="print-dialog-content">
      <div class="dialog-description">
        请选择要打印的制作日期和打印机，系统将打印该日期的所有订单生产清单。
      </div>

      <div class="date-selector">
        <label class="date-label">选择制作日期：</label>
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="请选择日期"
          style="width: 100%"
          :picker-options="pickerOptions"
          size="large"
        />
      </div>

      <div class="printer-selector" style="margin-top: 20px;">
        <label class="printer-label">
          选择打印机：
          <el-button
            type="text"
            @click="refreshPrinters"
            :loading="refreshingPrinters"
            size="small"
          >
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </label>

        <el-select
          v-model="selectedPrinter"
          placeholder="请选择打印机"
          style="width: 100%"
          size="large"
          :loading="loadingPrinters"
          filterable
        >
          <el-option
            v-for="printer in printers"
            :key="printer.name"
            :label="`${printer.name} ${printer.isDefault ? '(默认)' : ''} - ${printer.status}`"
            :value="printer.name"
          >
            <div class="printer-option">
              <div class="printer-name">
                {{ printer.name }}
                <el-tag v-if="printer.isDefault" type="success" size="small">默认</el-tag>
              </div>
              <div class="printer-status">{{ printer.status }}</div>
            </div>
          </el-option>
        </el-select>

        <div v-if="printers.length === 0 && !loadingPrinters" class="no-printers">
          <el-alert
            title="未发现打印机"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #default>
              系统未发现可用打印机。请确保打印机已连接并安装驱动，然后点击"刷新"按钮重新扫描。
            </template>
          </el-alert>
        </div>
      </div>

      <div class="print-options" style="margin-top: 20px;">
        <label class="options-label">打印选项：</label>
        <el-checkbox v-model="useSystemPrinter">使用系统打印机直接打印</el-checkbox>
        <div v-if="useSystemPrinter" class="print-options-info">
          <el-text type="info" size="small">
            选择此项将直接通过系统打印机打印，不再使用浏览器预览。建议用于生产环境。
          </el-text>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          @click="handleConfirmPrint"
          :disabled="!selectedDate"
          :loading="loading"
        >
          确认打印
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'confirm-print', 'print-to-printer'])

// Dialog visibility
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Selected date and printer
const selectedDate = ref(null)
const selectedPrinter = ref('')
const loading = ref(false)
const useSystemPrinter = ref(false)

// Printer management
const printers = ref([])
const loadingPrinters = ref(false)
const refreshingPrinters = ref(false)

// Disable dates before today
const disabledDate = (time) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selectedDate = new Date(time)
  selectedDate.setHours(0, 0, 0, 0)
  return selectedDate < today
}

// DatePicker shortcuts
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

// Handle close
const handleClose = () => {
  dialogVisible.value = false
  selectedDate.value = null
}

// Load printers from system
const loadPrinters = async () => {
  loadingPrinters.value = true
  try {
    const response = await fetch('/api/orders/printers')
    const result = await response.json()

    if (result.success) {
      printers.value = result.data.printers
      // Auto-select default printer
      const defaultPrinter = printers.value.find(p => p.isDefault)
      if (defaultPrinter) {
        selectedPrinter.value = defaultPrinter.name
      } else if (printers.value.length > 0) {
        selectedPrinter.value = printers.value[0].name
      }
    } else {
      console.error('获取打印机列表失败:', result.error)
      ElMessage.error(`获取打印机列表失败: ${result.error}`)
    }
  } catch (error) {
    console.error('加载打印机失败:', error)
    ElMessage.error('加载打印机失败，请检查网络连接')
  } finally {
    loadingPrinters.value = false
  }
}

// Refresh printers
const refreshPrinters = async () => {
  refreshingPrinters.value = true
  try {
    const response = await fetch('/api/orders/printers?refresh=true')
    const result = await response.json()

    if (result.success) {
      printers.value = result.data.printers
      ElMessage.success(`刷新成功，发现 ${printers.value.length} 台打印机`)
    } else {
      console.error('刷新打印机列表失败:', result.error)
      ElMessage.error(`刷新打印机列表失败: ${result.error}`)
    }
  } catch (error) {
    console.error('刷新打印机失败:', error)
    ElMessage.error('刷新打印机失败，请检查网络连接')
  } finally {
    refreshingPrinters.value = false
  }
}

// Get production order data for printing
const getProductionOrderData = async (dateStr) => {
  try {
    const response = await fetch(`/api/orders/production/${dateStr}`)
    const result = await response.json()

    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '获取生产订单数据失败')
    }
  } catch (error) {
    console.error('获取生产订单数据失败:', error)
    throw error
  }
}

// Print to system printer
const printToSystemPrinter = async (printerName, printData, dateStr) => {
  try {
    // 使用新的专用打印接口
    const response = await fetch('/api/orders/print-production-list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        printerName,
        date: dateStr
      })
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success(result.message)
    } else {
      throw new Error(result.error || '打印失败')
    }

    return result
  } catch (error) {
    console.error('系统打印机打印失败:', error)
    throw error
  }
}

// Open print preview window
const openPrintPreview = (printData, dateStr, dateIso) => {
  // 计算商品汇总数据
  const productSummary = {}
  let grandTotal = 0

  printData.forEach(order => {
    const customerInfo = order.customer_info || {}
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        // 使用完整名称作为key：大类-小类-商品名
        const fullName = `${item.category || ''}-${item.product_category || ''}-${item.name || ''}`
        const key = fullName
        if (!productSummary[key]) {
          productSummary[key] = {
            name: fullName,
            quantity: 0,
            unit: item.unit || '份'
          }
        }
        productSummary[key].quantity += item.quantity
      })
    }
    grandTotal += customerInfo.total_amount || 0
  })

  // 使用字符串拼接方式生成 HTML，避免 Vue 编译器问题
  const productSummaryRows = Object.values(productSummary).map((product, index) => {
    return '<tr>' +
      '<td style="text-align: center;">' + (index + 1) + '</td>' +
      '<td>' + product.name + '</td>' +
      '<td style="text-align: center; font-weight: bold; font-size: 20px;">' + product.quantity + ' ' + product.unit + '</td>' +
    '</tr>'
  }).join('')

  const orderDetailsRows = printData.map((order, index) => {
    const customerInfo = order.customer_info || {}
    let itemsHtml = ''

    if (order.items && order.items.length > 0) {
      itemsHtml = order.items.map(item => {
        const fullName = `${item.category || ''}-${item.product_category || ''}-${item.name || ''}`
        return '<li><span class="product-item-name">' + fullName + '</span> x ' + item.quantity + '</li>'
      }).join('')
    } else {
      itemsHtml = '<li>无商品信息</li>'
    }

    // 计算是否已结清
    const totalAmount = customerInfo.total_amount || 0
    const paidAmount = customerInfo.paid_amount || 0
    const isSettled = paidAmount >= totalAmount
    const settlementStatus = isSettled
      ? '<span style="font-size: 24px; font-weight: bold;">✓</span>'
      : '<span style="font-size: 24px; font-weight: bold;">⭕</span>'

    return '<tr>' +
      '<td style="text-align: center;">' + (index + 1) + '</td>' +
      '<td>' +
        '<strong>' + (customerInfo.name || '未知客户') + '</strong><br>' +
        '<span style="font-size: 14px; color: #555;">' + (customerInfo.address || '无地址') + '</span>' +
      '</td>' +
      '<td>' + (customerInfo.phone || '无电话') + '</td>' +
      '<td>' +
        '<ul class="product-list">' +
          itemsHtml +
        '</ul>' +
      '</td>' +
      '<td class="amount">¥ ' + totalAmount.toFixed(2) + '</td>' +
      '<td style="text-align: center;">' + settlementStatus + '</td>' +
      '<td>' + (customerInfo.notes || '无') + '</td>' +
    '</tr>'
  }).join('')

  // 创建打印预览HTML内容
  const getPrintHtml = () => {
    // 使用转义字符避免 Vue 编译器误解析 HTML 标签
    const htmlStart = '<' + '!DOCTYPE html>'
    const htmlTag = '<' + 'html lang="zh-CN">'
    const headTag = '<' + 'head>'
    const metaTag = '<' + 'meta charset="UTF-8">'
    const viewportTag = '<' + 'meta name="viewport" content="width=device-width, initial-scale=1.0">'
    const titleTag = '<' + 'title>生产清单汇总<' + '/title>'
    const styleTag = '<' + 'style>'
    const styleEnd = '<' + '/style>'
    const headEnd = '<' + '/head>'
    const bodyTag = '<' + 'body>'
    const bodyEnd = '<' + '/body>'
    const htmlEnd = '<' + '/html>'
    const scriptTag = '<' + 'script>'
    const scriptEnd = '<' + '/script>'

    return htmlStart + htmlTag + headTag + metaTag + viewportTag + titleTag + styleTag +
      'body{font-family:"Microsoft YaHei","SimSun",sans-serif;background-color:#f0f0f0;padding:20px;color:#333;font-size:18px}.container{max-width:210mm;margin:0 auto;background:white;padding:20px;box-shadow:0 0 10px rgba(0,0,0,0.1)}h1{text-align:center;font-size:28px;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px}h2{font-size:22px;margin-top:30px;margin-bottom:10px;border-left:5px solid #333;padding-left:10px}.summary-info{background-color:#f8f9fa;padding:15px;border-radius:6px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;font-size:18px}table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:18px}th,td{border:1px solid #000;padding:8px;text-align:left;vertical-align:top}th{background-color:#eee;font-weight:bold;text-align:center}.product-list{margin:0;padding-left:0;list-style:none}.product-list li{margin-bottom:4px}.product-item-name{font-weight:bold}.amount{text-align:right;font-family:Arial,sans-serif}.print-btn{display:block;width:200px;margin:0 auto 20px;padding:10px;background-color:#007bff;color:white;text-align:center;border:none;cursor:pointer;font-size:20px;border-radius:4px}.print-btn:hover{background-color:#0056b3}@media print{@page{size:A4;margin:1cm}body{background-color:white;padding:0;-webkit-print-color-adjust:exact}.container{width:100%;max-width:none;box-shadow:none;padding:0;margin:0}.print-btn{display:none}tr{page-break-inside:avoid}h2{margin-top:20px}}' +
      styleEnd + headEnd + bodyTag +
      '<' + 'button class="print-btn" onclick="window.print()">🖨️ 打印此页面 / 另存为PDF<' + '/button>' +
      '<' + 'div class="container">' +
        '<' + 'h1>' + dateStr + ' 生产明细<' + '/h1>' +
        '<' + 'div class="summary-info">' +
          '<' + 'div><' + 'strong>订单总数：<' + '/strong>' + printData.length + ' 单<' + '/div>' +
          '<' + 'div><' + 'strong>总金额：<' + '/strong>¥ ' + grandTotal.toFixed(2) + '<' + '/div>' +
        '<' + '/div>' +
        '<' + 'h2>📊 当日生产总量统计<' + '/h2>' +
        '<' + 'table>' +
          '<' + 'thead>' +
            '<' + 'tr>' +
              '<' + 'th style="width: 10%;">序号<' + '/th>' +
              '<' + 'th style="width: 60%;">商品名称<' + '/th>' +
              '<' + 'th style="width: 30%;">总数量<' + '/th>' +
            '<' + '/tr>' +
          '<' + '/thead>' +
          '<' + 'tbody>' +
            (productSummaryRows || '<' + 'tr><' + 'td colspan="3" style="text-align: center;">暂无商品数据<' + '/td><' + '/tr>') +
          '<' + '/tbody>' +
        '<' + '/table>' +
        '<' + 'h2>📋 用户订单明细<' + '/h2>' +
        '<' + 'table>' +
          '<' + 'thead>' +
            '<' + 'tr>' +
              '<' + 'th style="width: 5%;">序号<' + '/th>' +
              '<' + 'th style="width: 20%;">客户信息 (姓名/地址)<' + '/th>' +
              '<' + 'th style="width: 10%;">联系电话<' + '/th>' +
              '<' + 'th style="width: 25%;">商品信息<' + '/th>' +
              '<' + 'th style="width: 10%;">金额<' + '/th>' +
              '<' + 'th style="width: 15%;">结清状态<' + '/th>' +
              '<' + 'th style="width: 15%;">备注信息<' + '/th>' +
            '<' + '/tr>' +
          '<' + '/thead>' +
          '<' + 'tbody>' +
            orderDetailsRows +
          '<' + '/tbody>' +
        '<' + '/table>' +
        '<' + 'div style="margin-top: 20px; text-align: right; font-size: 14px; color: #666;">' +
          '打印时间: ' + new Date().toLocaleString() +
        '<' + '/div>' +
      '<' + '/div>' +
      scriptTag + 'window.onload=function(){}' + scriptEnd +
      bodyEnd + htmlEnd
  }

  const printContent = getPrintHtml()

  // 打开新窗口显示打印预览
  const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
  printWindow.document.write(printContent)
  printWindow.document.close()

  // 等待页面加载完成后再显示打印对话框
  printWindow.onload = function() {
    // 可以选择是否自动显示打印对话框
    // printWindow.print()
  }
}

// Handle confirm print
const handleConfirmPrint = async () => {
  if (!selectedDate.value) {
    ElMessage.warning('请选择要打印的日期')
    return
  }

  if (useSystemPrinter.value && !selectedPrinter.value) {
    ElMessage.warning('请选择打印机')
    return
  }

  const dateStr = dayjs(selectedDate.value).format('YYYY年MM月DD日')
  const dateIso = dayjs(selectedDate.value).format('YYYY-MM-DD')

  try {
    await ElMessageBox.confirm(
      '确定要打印 ' + dateStr + ' 的所有订单生产清单吗？' + (useSystemPrinter.value ? ' 将使用打印机: ' + selectedPrinter.value : ''),
      '确认打印',
      {
        confirmButtonText: '确定打印',
        cancelButtonText: '取消',
        type: 'info',
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            instance.confirmButtonLoading = true
            instance.confirmButtonText = '准备打印...'

            // 模拟加载过程
            setTimeout(() => {
              done()
            }, 500)
          } else {
            done()
          }
        }
      }
    )

    loading.value = true

    // 首先获取订单数据
    ElMessage.info('正在获取订单数据...')
    const printData = await getProductionOrderData(dateIso)

    // 检查是否有订单
    if (!printData || printData.length === 0) {
      ElMessage.warning(dateStr + ' 没有找到订单，无法打印')
      loading.value = false
      return
    }

    if (useSystemPrinter.value) {
      // 使用系统打印机直接打印
      try {
        ElMessage.info('正在发送到打印机: ' + selectedPrinter.value)
        await printToSystemPrinter(selectedPrinter.value, printData, dateIso)
        handleClose()
      } catch (error) {
        ElMessage.error('打印失败: ' + error.message)
      }
    } else {
      // 使用浏览器打印预览，打开新窗口填充 PrintPreview.html
      ElMessage.info('正在生成打印预览...')
      openPrintPreview(printData, dateStr, dateIso)
      handleClose()
    }

  } catch (error) {
    // 用户取消操作
    console.log('用户取消打印')
  } finally {
    loading.value = false
  }
}

// Load printers when dialog opens
const handleDialogOpen = () => {
  if (props.modelValue && printers.value.length === 0) {
    loadPrinters()
  }
}

// Watch for dialog visibility changes
onMounted(() => {
  loadPrinters()
})
</script>

<style scoped lang="scss">
.print-dialog-content {
  padding: 10px 0;

  .dialog-description {
    margin-bottom: 24px;
    padding: 16px;
    background-color: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid var(--el-color-primary);
    color: #606266;
    font-size: 14px;
    line-height: 1.6;
  }

  .date-selector, .printer-selector, .print-options {
    .date-label, .printer-label, .options-label {
      display: block;
      margin-bottom: 12px;
      font-weight: 500;
      color: #303133;
      font-size: 16px;
    }

    .printer-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    :deep(.el-date-editor), :deep(.el-select) {
      .el-input__inner {
        border-radius: 6px;
        border-color: #dcdfe6;
        transition: border-color 0.2s ease;

        &:focus {
          border-color: #409eff;
          box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
        }
      }
    }

    .printer-option {
      .printer-name {
        font-weight: 500;
        color: #303133;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .printer-status {
        font-size: 12px;
        color: #909399;
        margin-top: 4px;
      }
    }

    .no-printers {
      margin-top: 12px;
    }

    .print-options-info {
      margin-top: 8px;
      padding: 8px 12px;
      background-color: #f0f9ff;
      border-radius: 4px;
      border-left: 3px solid #409eff;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  .el-button {
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: 500;

    &.el-button--primary {
      background-color: #409eff;
      border-color: #409eff;

      &:hover {
        background-color: #79bbff;
        border-color: #79bbff;
      }

      &:disabled {
        background-color: #a0cfff;
        border-color: #a0cfff;
      }
    }
  }
}

// 弹窗样式优化
:deep(.el-dialog) {
  border-radius: 12px;

  .el-dialog__header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #f0f0f0;

    .el-dialog__title {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
  }

  .el-dialog__body {
    padding: 20px 24px;
  }

  .el-dialog__footer {
    padding: 16px 24px 20px;
    border-top: 1px solid #f0f0f0;
  }
}
</style>