<template>
  <div class="heatmap-wrapper">
    <!-- 头部控制区 -->
    <div class="controls">
      <button class="btn" @click="changeYear(-1)">
        &lt; 上一年
      </button>

      <h2 class="year-title">{{ currentYear }}年 订单统计</h2>

      <button class="btn" @click="changeYear(1)">
        下一年 &gt;
      </button>

      <!-- 销售总额显示 -->
      <div class="total-sales" @click="toggleSalesDisplay">
        <span class="sales-label">销售总额:</span>
        <span class="sales-value">{{ displayedSales }}</span>
      </div>
    </div>

    <!-- 图表容器 -->
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import axios from 'axios';
import { ElMessage } from 'element-plus';

// 状态定义
const chartRef = ref(null);
const currentYear = ref(new Date().getFullYear()); // 默认为当前年份
const totalSales = ref(0); // 销售总额
const showRealSales = ref(false); // 是否显示真实金额
let myChart = null;

// 计算显示的销售额（星号或真实金额）
const displayedSales = ref('******');

// 切换销售额显示状态
const toggleSalesDisplay = () => {
  showRealSales.value = !showRealSales.value;
  if (showRealSales.value) {
    displayedSales.value = `¥${totalSales.value.toFixed(2)}`;
  } else {
    displayedSales.value = '******';
  }
};

// 1. 从后端获取热力图数据
const getHeatmapData = async (year) => {
  try {
    // 使用相对路径,通过Vite代理访问后端API,避免浏览器代理问题
    const response = await axios.get(`/api/orders/heatmap/${year}`);
    if (response.data.success) {
      // 更新销售总额
      totalSales.value = response.data.total_sales || 0;
      // 重置显示状态为星号
      showRealSales.value = false;
      displayedSales.value = '******';

      // 后端返回的数据格式: [['2024-01-01', 5], ['2024-01-02', 3], ...]
      return response.data.data;
    } else {
      ElMessage.error('获取热力图数据失败');
      return [];
    }
  } catch (error) {
    console.error('获取热力图数据失败:', error);
    ElMessage.error('获取热力图数据失败: ' + (error.response?.data?.message || error.message));
    return [];
  }
};

// 2. 更新图表配置
const updateChart = async () => {
  if (!myChart) return;

  // 从后端获取真实数据
  const heatmapData = await getHeatmapData(currentYear.value);

  const option = {
    tooltip: {
      position: 'top',
      formatter: function (p) {
        return `
          <div style="text-align: center;">
            ${p.data[0]}<br/>
            <span style="font-weight:bold; font-size:14px;">${p.data[1]}</span> 单
          </div>
        `;
      }
    },
    visualMap: {
      min: 0,
      max: 100,
      type: 'piecewise', // 分段显示
      orient: 'horizontal',
      left: 'center',
      top: 0,
      textStyle: { color: '#555' },
      // --- 重点：浅黄→中黄→橙黄→大红渐变配置 ---
      pieces: [
        { min: 9, label: '爆单 (>10)', color: '#D32F2F' },     // 大红
        { min: 5, max: 8, label: '繁忙 (5-8)', color: '#FF9800' }, // 橙黄
        { min: 2, max: 5, label: '正常 (2-5)', color: '#FFC107' }, // 中黄
        { max: 2, label: '清闲 (<2)', color: '#FFF59D' }       // 浅黄
      ]
    },
    calendar: {
      top: 60,
      left: 30,
      right: 30,
      cellSize: ['auto', 14],
      range: currentYear.value.toString(), // 动态绑定年份
      itemStyle: {
        borderWidth: 0.5,
        borderColor: '#ccc',
        borderRadius: 3 // 添加圆角
      },
      yearLabel: { show: false }, // 隐藏自带的年份标签，因为我们在外部自己写了
      dayLabel: {
        firstDay: 1, // 周一开始
        nameMap: 'cn' // 中文显示周几
      },
      monthLabel: {
        nameMap: 'cn' // 中文显示月份
      }
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: heatmapData, // 使用从后端获取的真实数据
      itemStyle: {
        borderRadius: 3 // 热力图数据块的圆角
      }
    }
  };

  myChart.setOption(option);
};

// 3. 切换年份逻辑
const changeYear = (step) => {
  currentYear.value += step;
  updateChart(); // 重新渲染数据
};

// 生命周期
onMounted(() => {
  nextTick(() => {
    myChart = echarts.init(chartRef.value);
    updateChart();
    window.addEventListener('resize', handleResize);
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (myChart) myChart.dispose();
});

const handleResize = () => {
  myChart && myChart.resize();
};
</script>

<style scoped>
.heatmap-wrapper {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-width: 1000px;
  margin: 0 auto;
}

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;
  position: relative;
}

.year-title {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 600;
  width: 200px;
  text-align: center;
}

/* 销售总额样式 */
.total-sales {
  position: absolute;
  right: 20px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
  user-select: none;
}

.total-sales:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.total-sales:active {
  transform: translateY(0);
}

.sales-label {
  margin-right: 8px;
  opacity: 0.9;
}

.sales-value {
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 1px;
}

.chart-container {
  width: 100%;
  height: 300px; /* 高度需要固定，或者flex撑开 */
}

/* 简单的按钮样式 */
.btn {
  padding: 8px 16px;
  background-color: #4CAF50; /* 按钮也用绿色呼应主题 */
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn:hover {
  background-color: #45a049;
}

.btn:active {
  transform: scale(0.98);
}
</style>