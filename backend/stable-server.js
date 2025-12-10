const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

// 导入数据库和路由
const database = require('./models/database');
const orderRoutes = require('./routes/orders');
const goodsRoutes = require('./routes/goods');
const quickInputRoutes = require('./routes/quickInputs');

const app = express();
const PORT = process.env.PORT || 3000;

// 基础中间件
app.use(helmet());
// CORS配置 - 支持本地和网络访问
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.62.135:5173', // 当前网络IP
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://192.168.62.135:5174'  // 当前网络IP新端口
];

app.use(cors({
  origin: function (origin, callback) {
    // 允许没有origin的请求（如移动应用）
    if (!origin) return callback(null, true);

    // 检查origin是否在允许列表中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // 开发环境下允许所有localhost和192.168.x.x地址
      if (process.env.NODE_ENV !== 'production') {
        const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/;
        if (localhostRegex.test(origin)) {
          console.log(`开发环境：允许CORS请求: ${origin}`);
          return callback(null, true);
        }
      }

      console.log(`CORS拒绝: ${origin}`);
      callback(new Error('不被CORS策略允许'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: '花馍订单系统后端API',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由
app.use('/api/orders', orderRoutes);
app.use('/api/goods', goodsRoutes);
app.use('/api/quick-inputs', quickInputRoutes);

// 根路径
app.get('/api', (req, res) => {
  res.json({
    message: '花馍订单系统API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      orders: {
        list: 'GET /api/orders',
        create: 'POST /api/orders',
        get: 'GET /api/orders/:id',
        update: 'PUT /api/orders/:id',
        delete: 'DELETE /api/orders/:id',
        production: 'GET /api/orders/production/:date'
      },
      goods: {
        tree: 'GET /api/goods',
        flat: 'GET /api/goods/flat',
        categories: 'GET /api/goods/categories',
        subcategories: 'GET /api/goods/subcategories/:category',
        products: 'GET /api/goods/products/:category/:subcategory',
        search: 'GET /api/goods/search?q=keyword'
      },
      quickInputs: {
        list: 'GET /api/quick-inputs',
        create: 'POST /api/quick-inputs',
        update: 'PUT /api/quick-inputs/:id',
        delete: 'DELETE /api/quick-inputs/:id',
        reorder: 'PUT /api/quick-inputs/reorder'
      }
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl,
    method: req.method
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 启动服务器
async function startServer() {
  try {
    console.log('正在启动花馍订单系统后端服务...');
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`端口: ${PORT}`);

    // 初始化数据库（带错误处理）
    try {
      await database.initialize();
      console.log('✅ 数据库初始化成功');
    } catch (dbError) {
      console.warn('⚠️  数据库初始化失败，但服务器继续运行:', dbError.message);
      console.warn('⚠️  请检查数据库配置和文件权限');
    }

    // 启动HTTP服务器
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 服务器启动成功！');
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
      console.log(`📚 API文档: http://localhost:${PORT}/api`);
      console.log(`💾 数据库路径: ${process.env.DB_PATH || './database.db'}`);
      console.log('');
      console.log('可用的API端点:');
      console.log('- GET  /health          - 健康检查');
      console.log('- GET  /api              - API信息');
      console.log('- GET  /api/orders      - 获取订单列表');
      console.log('- POST /api/orders      - 创建新订单');
      console.log('- GET  /api/goods       - 获取商品目录');
      console.log('');
      console.log('按 Ctrl+C 停止服务器');
    });

  } catch (error) {
    console.error('❌ 服务器启动失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 优雅关闭处理
process.on('SIGINT', async () => {
  console.log('\n收到SIGINT信号，正在关闭服务器...');
  try {
    if (database.db) {
      await database.close();
      console.log('✅ 数据库连接已关闭');
    }
    console.log('👋 服务器已关闭');
    process.exit(0);
  } catch (error) {
    console.error('关闭服务器时出错:', error.message);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n收到SIGTERM信号，正在关闭服务器...');
  try {
    if (database.db) {
      await database.close();
      console.log('✅ 数据库连接已关闭');
    }
    console.log('👋 服务器已关闭');
    process.exit(0);
  } catch (error) {
    console.error('关闭服务器时出错:', error.message);
    process.exit(1);
  }
});

// 启动服务
startServer();

module.exports = app;