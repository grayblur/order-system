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
    </div>

    <!-- 图表容器 -->
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';

// 状态定义
const chartRef = ref(null);
const currentYear = ref(new Date().getFullYear()); // 默认为当前年份
let myChart = null;

// 1. 模拟数据生成器 (根据年份生成每一天的假数据)
const getVirtualData = (year) => {
  const date = +echarts.number.parseDate(year + '-01-01');
  const end = +echarts.number.parseDate(+year + 1 + '-01-01');
  const dayTime = 3600 * 24 * 1000;
  const data = [];
  
  for (let time = date; time < end; time += dayTime) {
    // 模拟：生成 0 到 100 之间的随机订单数
    // 为了模拟真实感，加了一些随机波动
    const count = Math.floor(Math.random() * 100); 
    data.push([
      echarts.format.formatTime('yyyy-MM-dd', time),
      count
    ]);
  }
  return data;
};

// 2. 更新图表配置
const updateChart = () => {
  if (!myChart) return;

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
      // --- 重点：绿色调配置 ---
      pieces: [
        { min: 80, label: '爆单 (>80)', color: '#1B5E20' },     // 深绿 (Material Green 900)
        { min: 50, max: 80, label: '繁忙 (50-80)', color: '#43A047' }, // 中绿 (Material Green 600)
        { min: 20, max: 50, label: '正常 (20-50)', color: '#A5D6A7' }, // 浅绿 (Material Green 200)
        { max: 20, label: '清闲 (<20)', color: '#E8F5E9' }       // 极浅绿 (Material Green 50)
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
        borderColor: '#ccc'
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
      data: getVirtualData(currentYear.value) // 动态获取数据
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
}

.year-title {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 600;
  width: 200px;
  text-align: center;
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