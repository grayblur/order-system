const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

const database = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: '花馍订单系统后端API'
  });
});

// 测试数据库连接端点
app.get('/test-db', async (req, res) => {
  try {
    const result = await database.get('SELECT COUNT(*) as count FROM orders');
    res.json({
      success: true,
      message: '数据库连接正常',
      data: result
    });
  } catch (error) {
    console.error('数据库测试失败:', error);
    res.status(500).json({
      success: false,
      error: '数据库连接失败',
      message: error.message
    });
  }
});

// 启动服务器
async function startServer() {
  try {
    console.log('正在初始化数据库...');
    await database.initialize();
    console.log('数据库初始化完成');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`测试服务器运行在端口 ${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
      console.log(`数据库测试: http://localhost:${PORT}/test-db`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();