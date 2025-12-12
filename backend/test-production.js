const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// 加载生产环境配置（开发测试）
require('dotenv').config({ path: '.env.production' });

const database = require('./models/database');
const orderRoutes = require('./routes/orders');
const goodsRoutes = require('./routes/goods');

const app = express();
const PORT = process.env.PORT || 3000;

// 开发测试时使用当前目录的数据库
const DB_PATH = process.env.NODE_ENV === 'production'
  ? process.env.DB_PATH
  : './database.db';

// 确保必要的目录存在（仅在需要时，增强版错误处理）
const ensureDirectoryExists = (dirPath) => {
  if (process.env.NODE_ENV === 'production') {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
        console.log(`✅ 目录创建成功: ${dirPath}`);
      } else {
        console.log(`✅ 目录已存在: ${dirPath}`);
      }
    } catch (error) {
      console.error(`❌ 无法创建目录: ${dirPath}`);
      console.error(`   错误信息: ${error.message}`);
      console.error(`   当前用户: ${process.getuid ? process.getuid() : 'unknown'}`);
      console.warn(`⚠️  目录创建失败，但测试将继续运行...`);
    }
  }
};

// 只在开发环境或测试环境创建目录，生产环境由 systemd 负责创建
if (process.env.NODE_ENV !== 'production') {
  ensureDirectoryExists(path.dirname(DB_PATH));
  if (process.env.LOG_FILE) {
    ensureDirectoryExists(path.dirname(process.env.LOG_FILE));
  }
  if (process.env.BACKUP_PATH) {
    ensureDirectoryExists(process.env.BACKUP_PATH);
  }
}

// 日志配置（简化版）
let logStream;
if (process.env.NODE_ENV === 'production') {
  // 生产环境假设目录已由 systemd 创建
  try {
    logStream = fs.createWriteStream(process.env.LOG_FILE, { flags: 'a' });
    console.log(`✅ 日志流创建成功: ${process.env.LOG_FILE}`);
  } catch (error) {
    console.warn(`⚠️  无法创建日志流，将使用控制台输出: ${error.message}`);
    logStream = {
      write: (data) => console.log(`[APP LOG] ${data.toString().trim()}`),
      end: () => console.log('[APP LOG] 日志流结束')
    };
  }
}

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS 配置
const allowedOrigins = process.env.ALLOWED_ORIGINS ?
  process.env.ALLOWED_ORIGINS.split(',') :
  ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      console.log(`CORS拒绝: ${origin}`);
      callback(new Error('不被CORS策略允许'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 日志配置
if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logStream }));
}

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 信任代理（如果在反向代理后面）
app.set('trust proxy', 1);

// 健康检查端点
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: '花馍订单系统后端API',
    environment: process.env.NODE_ENV || 'test',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: database.db ? 'connected' : 'disconnected',
    dbPath: DB_PATH
  };

  res.status(200).json(healthCheck);
});

// API路由
app.use('/api/orders', orderRoutes);
app.use('/api/goods', goodsRoutes);

// API信息端点
app.get('/api', (req, res) => {
  res.json({
    message: '花馍订单系统API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'test',
    dbPath: DB_PATH,
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
      }
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const errorResponse = {
    error: '服务器内部错误',
    message: (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') ? err.message : '请稍后重试',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  };

  res.status(err.status || 500).json(errorResponse);
});

// 启动服务器
async function startServer() {
  try {
    console.log('🚀 正在启动花馍订单系统测试服务器...');
    console.log(`📍 环境: ${process.env.NODE_ENV || 'test'}`);
    console.log(`🔌 端口: ${PORT}`);
    console.log(`💾 数据库路径: ${DB_PATH}`);

    if (process.env.LOG_FILE) {
      console.log(`📝 日志文件: ${process.env.LOG_FILE}`);
    }

    // 初始化数据库
    try {
      await database.initialize();
      console.log('✅ 数据库初始化成功');
    } catch (dbError) {
      console.error('❌ 数据库初始化失败:', dbError.message);
      throw dbError;
    }

    // 启动HTTP服务器
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 测试服务器启动成功！');
      console.log(`🌐 服务地址: http://0.0.0.0:${PORT}`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
      console.log(`📚 API文档: http://localhost:${PORT}/api`);
      console.log('');
      console.log('🔧 测试环境特性:');
      console.log('- ✅ CORS 配置');
      console.log('- ✅ 错误处理');
      console.log('- ✅ 健康检查');
      console.log('- ✅ 日志记录');
    });

    // 设置服务器超时
    server.timeout = parseInt(process.env.CONNECTION_TIMEOUT) || 30000;
    console.log(`⏱️  连接超时: ${server.timeout}ms`);

  } catch (error) {
    console.error('❌ 服务器启动失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 启动服务
startServer();

module.exports = app;