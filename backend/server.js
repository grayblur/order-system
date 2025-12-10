const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

const database = require('./models/database');
const orderRoutes = require('./routes/orders');
const goodsRoutes = require('./routes/goods');
const quickInputRoutes = require('./routes/quickInputs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    // 允许无 origin 的请求（如 curl）和本地/局域网访问
    if (!origin || origin.match(/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API路由
app.use('/api/orders', orderRoutes);
app.use('/api/goods', goodsRoutes);
app.use('/api/quick-inputs', quickInputRoutes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: '花馍订单系统后端API'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl
  });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    console.log('正在初始化数据库...');
    await database.initialize();
    console.log('数据库初始化完成');

    // 启动服务器
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`花馍订单系统后端API运行在端口 ${PORT}`);
      console.log(`环境: ${process.env.NODE_ENV}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
      console.log(`API文档: http://localhost:${PORT}/api/goods`);
      console.log(`数据库路径: ${process.env.DB_PATH}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  try {
    await database.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('关闭服务器时出错:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n收到SIGTERM信号，正在关闭服务器...');
  try {
    await database.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('关闭服务器时出错:', error);
    process.exit(1);
  }
});

startServer();

module.exports = app;