const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 基础中间件
app.use(cors());
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: '花馍订单系统后端API'
  });
});

// 基础API端点
app.get('/api', (req, res) => {
  res.json({
    message: '花馍订单系统API',
    version: '1.0.0',
    endpoints: [
      '/health - 健康检查',
      '/api - API信息'
    ]
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`简版后端API运行在端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`API信息: http://localhost:${PORT}/api`);
});

module.exports = app;