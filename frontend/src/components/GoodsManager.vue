<template>
  <div class="goods-manager">
    <!-- 弹窗 -->
    <el-dialog
      v-model="visible"
      title="🌺 商品管理中心"
      width="90%"
      :before-close="handleClose"
      @open="loadGoodsData"
    >
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="searchText"
            placeholder="搜索商品..."
            prefix-icon="Search"
            style="width: 250px;"
            clearable
          />
          <el-button type="primary" @click="handleAddCategory" style="margin-left: 10px;">
            <el-icon><Plus /></el-icon>
            新增分类
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
          <el-button type="success" @click="handleSaveAll">
            <el-icon><Check /></el-icon>
            保存全部
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <div class="goods-table-wrapper">
        <el-table
          ref="goodsTableRef"
          :data="filteredGoods"
          stripe
          style="width: 100%"
          row-key="id"
          :default-expand-all="false"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
          @row-click="handleRowClick"
        >
          <!-- 商品名称列 -->
          <el-table-column prop="label" label="商品名称" min-width="200">
            <template #default="{ row }">
              <div class="cell-content">
                <span v-if="row.editId !== row.id" class="label-text">
                  {{ row.label }}
                  <el-tag v-if="row.isCategory" type="info" size="small" style="margin-left: 8px;">
                    {{ row.children ? row.children.length : 0 }}项
                  </el-tag>
                </span>
                <el-input
                  v-else
                  v-model="row.label"
                  size="small"
                  @keyup.enter="handleSaveCell(row)"
                  @blur="handleSaveCell(row)"
                  :placeholder="row.isCategory ? '分类名称' : '商品名称'"
                  autofocus
                />
              </div>
            </template>
          </el-table-column>

          <!-- 价格列 -->
          <el-table-column prop="price" label="价格 (¥)" width="120" align="center">
            <template #default="{ row }">
              <div v-if="!row.isCategory" class="cell-content">
                <span v-if="row.editId !== row.id">{{ row.price || '-' }}</span>
                <el-input-number
                  v-else
                  v-model="row.price"
                  :min="0"
                  :step="1"
                  size="small"
                  @keyup.enter="handleSaveCell(row)"
                  @blur="handleSaveCell(row)"
                />
              </div>
            </template>
          </el-table-column>

          <!-- 单位列 -->
          <el-table-column prop="unit" label="单位" width="100" align="center">
            <template #default="{ row }">
              <div v-if="!row.isCategory" class="cell-content">
                <span v-if="row.editId !== row.id">{{ row.unit || '-' }}</span>
                <el-input
                  v-else
                  v-model="row.unit"
                  size="small"
                  placeholder="如: 个/套/对"
                  @keyup.enter="handleSaveCell(row)"
                  @blur="handleSaveCell(row)"
                />
              </div>
            </template>
          </el-table-column>

          <!-- 分类信息列 -->
          <el-table-column label="所属分类" min-width="180">
            <template #default="{ row }">
              <span v-if="!row.isCategory" class="category-info">
                <el-tag type="warning" size="small">{{ row.category || '-' }}</el-tag>
                <el-tag type="success" size="small" style="margin-left: 4px;">
                  {{ row.subcategory || '-' }}
                </el-tag>
              </span>
            </template>
          </el-table-column>

          <!-- 操作列 -->
          <el-table-column label="操作" width="220" fixed="right" align="center">
            <template #default="{ row }">
              <el-space size="small" wrap>
                <!-- 编辑按钮 -->
                <el-button
                  v-if="row.editId !== row.id"
                  size="small"
                  type="primary"
                  link
                  @click.stop="handleEdit(row)"
                >
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button
                  v-else
                  size="small"
                  type="success"
                  link
                  @click.stop="handleSaveCell(row)"
                >
                  <el-icon><Check /></el-icon>
                  保存
                </el-button>

                <!-- 添加子分类按钮（仅第1层和第2层显示） -->
                <el-button
                  v-if="row.isCategory && !row.productCategory"
                  size="small"
                  type="warning"
                  link
                  @click.stop="handleAddSubcategory(row)"
                >
                  <el-icon><Plus /></el-icon>
                  添加子分类
                </el-button>

                <!-- 添加商品按钮（第3层商品分类显示） -->
                <el-button
                  v-if="row.isCategory && row.productCategory"
                  size="small"
                  type="success"
                  link
                  @click.stop="handleAddProduct(row)"
                >
                  <el-icon><Plus /></el-icon>
                  添加商品
                </el-button>

                <!-- 删除按钮 -->
                <el-popconfirm
                  title="确定删除吗？"
                  :confirm-button-text="row.isCategory ? '删除分类及所有商品' : '确定删除'"
                  cancel-button-text="取消"
                  @confirm="handleDelete(row)"
                >
                  <template #reference>
                    <el-button size="small" type="danger" link @click.stop>
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-button>
                  </template>
                </el-popconfirm>
              </el-space>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 操作提示 -->
      <div class="tips-box">
        <el-alert
          title="温馨提示"
          type="info"
          :closable="false"
          description="点击编辑按钮修改商品信息，新增的商品会自动同步到订单系统。删除操作不可恢复，请谨慎操作。"
        />
      </div>

      <!-- 底部按钮 -->
      <template #footer>
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleSaveAll">保存所有更改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Check, Download, Search } from '@element-plus/icons-vue'

const visible = ref(false)
const searchText = ref('')
const goodsTableRef = ref()

// 商品数据
const goodsData = reactive([])
const originalData = ref(null)

// 编辑状态跟踪
const editingIds = new Set()

// 打开对话框
const open = () => {
  visible.value = true
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  searchText.value = ''
}

// 处理行点击事件 - 切换展开/收起
const handleRowClick = (row, column, event) => {
  // 如果正在编辑该行，不触发展开/收起
  if (row.editId === row.id) {
    return
  }

  // 如果点击的是操作列，不触发展开/收起
  if (column && column.label === '操作') {
    return
  }

  // 如果点击的是分类行，切换展开状态
  if (row.isCategory) {
    goodsTableRef.value.toggleRowExpansion(row)
  }
}

// 加载商品数据
const loadGoodsData = async () => {
  try {
    const response = await fetch('/api/goods')
    const result = await response.json()

    if (result.success && result.data) {
      const treeData = convertApiDataToTree(result.data)
      goodsData.splice(0, goodsData.length, ...treeData)
      originalData.value = JSON.parse(JSON.stringify(treeData))
      console.log('✅ 加载商品数据成功')
    } else {
      ElMessage.error('加载商品数据失败')
    }
  } catch (error) {
    console.error('加载失败:', error)
    ElMessage.error('网络错误')
  }
}

// 将 API 数据转换为树形结构
const convertApiDataToTree = (apiData) => {
  const result = []
  let nodeId = 1

  Object.keys(apiData).forEach(categoryName => {
    const categoryData = apiData[categoryName]
    const categoryNode = {
      id: `c_${nodeId++}`,
      label: categoryName,
      isCategory: true,
      hasChildren: true,
      children: [],
      editId: null
    }

    Object.keys(categoryData).forEach(subcategoryName => {
      const subcategoryItems = categoryData[subcategoryName]
      const subcategoryNode = {
        id: `sc_${nodeId++}`,
        label: subcategoryName,
        isCategory: true,
        hasChildren: true,
        children: [],
        editId: null,
        category: categoryName
      }

      // 处理商品列表
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
          unit: product.unit,
          isCategory: false,
          editId: null,
          category: categoryName,
          subcategory: subcategoryName,
          productCategory: thirdLevelCategory
        })
      })

      // 将商品分组为树节点
      Object.keys(productGroups).forEach(thirdLevelName => {
        const thirdLevelNode = {
          id: `tl_${nodeId++}`,
          label: thirdLevelName,
          isCategory: true,
          hasChildren: true,
          children: productGroups[thirdLevelName],
          editId: null,
          category: categoryName,
          subcategory: subcategoryName,
          productCategory: thirdLevelName  // 标记为第三层商品分类
        }
        subcategoryNode.children.push(thirdLevelNode)
      })

      categoryNode.children.push(subcategoryNode)
    })

    result.push(categoryNode)
  })

  return result
}

// 搜索过滤
const filteredGoods = computed(() => {
  if (!searchText.value.trim()) return goodsData

  const search = searchText.value.toLowerCase()
  const filterTree = (nodes) => {
    return nodes
      .filter(node => {
        const matches = node.label.toLowerCase().includes(search)
        const childrenMatch = node.children ? filterTree(node.children).length > 0 : false
        return matches || childrenMatch
      })
      .map(node => ({
        ...node,
        children: node.children ? filterTree(node.children) : node.children
      }))
  }

  return filterTree(goodsData)
})

// 编辑操作
const handleEdit = (row) => {
  row.editId = row.id
  editingIds.add(row.id)
}

// 保存单元格
const handleSaveCell = async (row) => {
  try {
    // 验证
    if (!row.label.trim()) {
      ElMessage.error('名称不能为空')
      return
    }

    if (!row.isCategory && (row.price === null || row.price === undefined)) {
      ElMessage.warning('请输入价格')
      return
    }

    row.editId = null
    editingIds.delete(row.id)

    // 本地修改完毕，稍后批量保存
    ElMessage.success('修改成功')
  } catch (error) {
    ElMessage.error('保存失败')
    console.error(error)
  }
}

// 新增分类
const handleAddCategory = async () => {
  const { value: categoryName } = await ElMessageBox.prompt(
    '请输入新分类名称',
    '新增分类',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^.{1,20}$/,
      inputErrorMessage: '分类名称长度应在 1-20 个字符'
    }
  ).catch(() => ({ value: null }))

  if (categoryName) {
    const newCategory = {
      id: `c_${Date.now()}`,
      label: categoryName,
      isCategory: true,
      hasChildren: true,
      children: [],
      editId: null
    }
    goodsData.push(newCategory)
    ElMessage.success('分类新增成功')
  }
}

// 新增子分类（第2层或第3层）
const handleAddSubcategory = async (categoryRow) => {
  const { value: subcategoryName } = await ElMessageBox.prompt(
    '请输入子分类名称',
    '新增子分类',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^.{1,20}$/,
      inputErrorMessage: '子分类名称长度应在 1-20 个字符'
    }
  ).catch(() => ({ value: null }))

  if (subcategoryName) {
    // 判断当前节点层级
    // 第1层：没有 category 属性
    // 第2层：有 category 但没有 subcategory 属性
    const isFirstLevel = !categoryRow.category
    const isSecondLevel = categoryRow.category && !categoryRow.subcategory

    const newSubcategory = {
      id: `sc_${Date.now()}`,
      label: subcategoryName,
      isCategory: true,
      hasChildren: true,
      children: [],
      editId: null,
      // 从第1层添加：category = 父节点的label
      // 从第2层添加：category = 父节点的category
      category: isFirstLevel ? categoryRow.label : categoryRow.category,
      // 从第1层添加：不设置 subcategory
      // 从第2层添加：subcategory = 父节点的label
      subcategory: isSecondLevel ? categoryRow.label : undefined,
      // 从第1层添加：不设置 productCategory
      // 从第2层添加：productCategory = 新子分类名称（标记为第3层）
      productCategory: isSecondLevel ? subcategoryName : undefined
    }

    if (!categoryRow.children) {
      categoryRow.children = []
    }

    categoryRow.children.push(newSubcategory)
    ElMessage.success('子分类新增成功')
  }
}

// 新增商品（第4层）
const handleAddProduct = async (categoryRow) => {
  const { value: productName } = await ElMessageBox.prompt(
    '请输入商品名称',
    '新增商品',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    }
  ).catch(() => ({ value: null }))

  if (productName) {
    const newProduct = {
      id: `p_${Date.now()}`,
      label: productName,
      price: 0,
      unit: '个',
      isCategory: false,
      editId: null,
      category: categoryRow.category,
      subcategory: categoryRow.subcategory,
      productCategory: categoryRow.label
    }

    if (!categoryRow.children) {
      categoryRow.children = []
    }

    categoryRow.children.push(newProduct)
    ElMessage.success('商品新增成功，请编辑设置价格')
  }
}

// 保持原来的函数名（向后兼容）
const handleAddItem = handleAddProduct

// 删除操作
const handleDelete = async (row) => {
  try {
    const deleteFromTree = (nodes, targetId) => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === targetId) {
          nodes.splice(i, 1)
          return true
        }
        if (nodes[i].children && deleteFromTree(nodes[i].children, targetId)) {
          // 如果删除后子数组为空，更新 hasChildren
          if (nodes[i].children.length === 0) {
            nodes[i].hasChildren = false
          }
          return true
        }
      }
      return false
    }

    deleteFromTree(goodsData, row.id)
    ElMessage.success('删除成功')
  } catch (error) {
    ElMessage.error('删除失败')
    console.error(error)
  }
}

// 保存所有更改到后端
const handleSaveAll = async () => {
  try {
    // 将树形结构转换回 API 格式
    const apiData = convertTreeToApiData(goodsData)

    ElMessage({
      message: '正在保存...',
      type: 'info',
      duration: 0
    })

    const response = await fetch('/api/goods', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: apiData
      })
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.closeAll()
      ElMessage.success('所有更改已保存！')
      originalData.value = JSON.parse(JSON.stringify(goodsData))
    } else {
      ElMessage.error(result.error || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('网络错误，保存失败')
  }
}

// 将树形结构转换回原始 goods.json 格式
// 原格式: {"goods":{"枣糕":{"上头糕":{"大花":{"百年好合":398,...},...},...},...}}
const convertTreeToApiData = (nodes) => {
  const result = {}

  nodes.forEach(categoryNode => {
    if (!categoryNode.isCategory) return

    // 第1层：主分类 (枣糕、果蔬) - 对象
    result[categoryNode.label] = {}

    if (categoryNode.children) {
      categoryNode.children.forEach(subcategoryNode => {
        if (!subcategoryNode.isCategory) return

        // 第2层：子分类 (上头糕、剃头糕) - 对象
        result[categoryNode.label][subcategoryNode.label] = {}

        if (subcategoryNode.children) {
          subcategoryNode.children.forEach(thirdLevelNode => {
            if (!thirdLevelNode.isCategory) return

            // 第3层：产品分类 (大花、小花) - 对象
            result[categoryNode.label][subcategoryNode.label][thirdLevelNode.label] = {}

            if (thirdLevelNode.children) {
              thirdLevelNode.children.forEach(productNode => {
                if (productNode.isCategory) return

                // 第4层：具体商品 - 商品名: 价格
                result[categoryNode.label][subcategoryNode.label][thirdLevelNode.label][productNode.label] = productNode.price || 0
              })
            }
          })
        }
      })
    }
  })

  return result
}

// 导出数据
const handleExport = () => {
  try {
    const apiData = convertTreeToApiData(goodsData)
    const jsonString = JSON.stringify({ goods: apiData }, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `goods_${new Date().getTime()}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
    console.error(error)
  }
}

// 暴露方法
defineExpose({
  open,
  visible
})
</script>

<style scoped lang="scss">
.goods-manager {
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 6px;

    .toolbar-left,
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .toolbar-right {
      margin-left: auto;
    }
  }

  .goods-table-wrapper {
    margin-bottom: 20px;
    border-radius: 6px;
    overflow: hidden;

    :deep(.el-table) {
      border-radius: 6px;

      .el-table__header {
        background-color: #fafafa;
      }
    }
  }

  .cell-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;

    .label-text {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    :deep(.el-input) {
      flex: 1;

      .el-input__wrapper {
        border-color: #e74c3c;
      }
    }

    :deep(.el-input-number) {
      width: 100%;
    }
  }

  .category-info {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .tips-box {
    margin-top: 20px;

    :deep(.el-alert) {
      background-color: #e6f7ff;
      border-color: #91d5ff;

      .el-alert__title {
        color: #0050b3;
      }

      .el-alert__description {
        color: #0050b3;
      }
    }
  }
}
</style>
