const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// 加载环境配置
// 如果 NODE_ENV 是 production，则加载 .env.production，否则加载默认的 .env
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '.env.production' });
} else {
  require('dotenv').config(); // 加载默认 .env 文件
}

const database = require('./models/database');
const orderRoutes = require('./routes/orders');
const goodsRoutes = require('./routes/goods');
const quickInputRoutes = require('./routes/quickInputs');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保必要的目录存在（增强版，包含权限检查）
const ensureDirectoryExists = (dirPath) => {
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
    console.error(`   用户名: ${require('os').userInfo().username}`);

    // 检查父目录权限
    const parentDir = require('path').dirname(dirPath);
    try {
      const stats = fs.statSync(parentDir);
      console.error(`   父目录权限: ${stats.mode.toString(8)}`);
      console.error(`   父目录所有者: UID ${stats.uid}, GID ${stats.gid}`);
    } catch (parentError) {
      console.error(`   无法获取父目录信息: ${parentError.message}`);
    }

    // 在生产环境中，如果是权限问题，建议使用部署脚本创建目录
    if (process.env.NODE_ENV === 'production') {
      console.error(`   建议解决方案:`);
      console.error(`   1. 确保已运行部署脚本: sudo ./deploy.sh`);
      console.error(`   2. 手动创建目录: sudo mkdir -p ${dirPath}`);
      console.error(`   3. 设置正确权限: sudo chown -R order-system:order-system ${dirPath}`);
    }

    // 不要抛出错误，让服务继续运行，但记录问题
    console.warn(`⚠️  目录创建失败，但服务将继续运行...`);
  }
};

// 确保目录存在（确保环境变量已定义且有默认值）
// 在开发环境中使用相对路径，避免权限问题
const isDev = process.env.NODE_ENV !== 'production';
const dbPath = isDev ? './database.db' : (process.env.DB_PATH || './database.db');
const logFile = isDev ? './logs/app.log' : (process.env.LOG_FILE || './logs/app.log');
const backupPath = isDev ? './backups' : (process.env.BACKUP_PATH || './backups');

// 只在开发环境中创建目录，生产环境由 systemd 负责创建
if (isDev) {
  ensureDirectoryExists(path.dirname(dbPath));
  ensureDirectoryExists(path.dirname(logFile));
  ensureDirectoryExists(backupPath);
}

// 日志配置（简化版）
let logStream;
try {
  // 在开发环境中，检查目录是否存在
  if (isDev && !fs.existsSync(path.dirname(logFile))) {
    console.warn(`⚠️  开发环境日志目录不存在，将使用控制台输出: ${path.dirname(logFile)}`);
    logStream = {
      write: (data) => console.log(`[APP LOG] ${data.toString().trim()}`),
      end: () => console.log('[APP LOG] 日志流结束')
    };
  } else {
    // 生产环境假设目录已由 systemd 创建，开发环境目录也存在
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
    console.log(`✅ 日志流创建成功: ${logFile}`);
  }
} catch (error) {
  console.warn(`⚠️  无法创建日志流，将使用控制台输出: ${error.message}`);
  logStream = {
    write: (data) => console.log(`[APP LOG] ${data.toString().trim()}`),
    end: () => console.log('[APP LOG] 日志流结束')
  };
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

// 生产环境 CORS 配置
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 日志配置
if ((process.env.LOG_LEVEL || 'info') === 'debug') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logStream }));
}

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 信任代理（如果在反向代理后面）
app.set('trust proxy', 1);

// 健康检查端点（增强版）
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: '花馍订单系统后端API',
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: database.db ? 'connected' : 'disconnected'
  };

  res.status(200).json(healthCheck);
});

// API路由
app.use('/api/orders', orderRoutes);
app.use('/api/goods', goodsRoutes);
app.use('/api/quick-inputs', quickInputRoutes);

// API信息端点
app.get('/api', (req, res) => {
  res.json({
    message: '花馍订单系统API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
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
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件（增强版）
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
    message: (process.env.NODE_ENV || 'development') === 'development' ? err.message : '请稍后重试',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  };

  res.status(err.status || 500).json(errorResponse);
});

// 优雅关闭处理
const gracefulShutdown = async (signal) => {
  console.log(`\n收到${signal}信号，正在优雅关闭服务器...`);

  try {
    // 关闭数据库连接
    if (database.db) {
      await database.close();
      console.log('✅ 数据库连接已关闭');
    }

    // 关闭日志流
    if (logStream) {
      logStream.end();
      console.log('✅ 日志流已关闭');
    }

    console.log('👋 服务器已优雅关闭');
    process.exit(0);
  } catch (error) {
    console.error('关闭服务器时出错:', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  console.error('Promise:', promise);
  gracefulShutdown('unhandledRejection');
});

// 启动服务器
async function startServer() {
  try {
    console.log('🚀 正在启动花馍订单系统生产服务器...');
    console.log(`📍 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 端口: ${PORT}`);
    console.log(`💾 数据库路径: ${dbPath}`);
    console.log(`📝 日志文件: ${logFile}`);

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
      console.log('🎉 生产服务器启动成功！');
      console.log(`🌐 服务地址: http://0.0.0.0:${PORT}`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
      console.log(`📚 API文档: http://localhost:${PORT}/api`);
      console.log('');
      console.log('🔧 生产环境特性已启用:');
      console.log('- ✅ 安全头设置');
      console.log('- ✅ 日志记录');
      console.log('- ✅ 错误处理');
      console.log('- ✅ 优雅关闭');
      console.log('- ✅ 进程监控');
      console.log('- ✅ 文件上传限制');
      console.log('- ✅ 代理支持');
      console.log('- ✅ 完整API端点');
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