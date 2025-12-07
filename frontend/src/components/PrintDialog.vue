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
        请选择要打印的配送日期，系统将打印该日期的所有订单生产清单。
      </div>

      <div class="date-selector">
        <label class="date-label">选择配送日期：</label>
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="请选择日期"
          style="width: 100%"
          :disabled-date="disabledDate"
          :picker-options="pickerOptions"
          size="large"
        />
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
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'confirm-print'])

// Dialog visibility
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Selected date
const selectedDate = ref(null)
const loading = ref(false)

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

// Handle confirm print
const handleConfirmPrint = async () => {
  if (!selectedDate.value) {
    ElMessage.warning('请选择要打印的日期')
    return
  }

  const dateStr = dayjs(selectedDate.value).format('YYYY年MM月DD日')

  try {
    await ElMessageBox.confirm(
      `确定要打印 ${dateStr} 的所有订单生产清单吗？`,
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

    // 发送打印事件给父组件
    loading.value = true
    emit('confirm-print', selectedDate.value)

    // 关闭弹窗
    handleClose()

  } catch (error) {
    // 用户取消操作
    console.log('用户取消打印')
  } finally {
    loading.value = false
  }
}
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

  .date-selector {
    .date-label {
      display: block;
      margin-bottom: 12px;
      font-weight: 500;
      color: #303133;
      font-size: 16px;
    }

    :deep(.el-date-editor) {
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