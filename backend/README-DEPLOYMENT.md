# 花馍订单管理系统 - 后端部署指南

## 📋 概述

本后端服务基于 Node.js + Express + SQLite 构建，专为 ARM 架构（Armbian）优化，支持跨平台部署。

### 🎯 技术栈
- **运行时**: Node.js 20+
- **框架**: Express.js
- **数据库**: SQLite3
- **安全**: Helmet.js + CORS
- **日志**: Morgan + 自定义日志

### 🔧 项目结构
```
backend/
├── production-server.js      # 生产环境服务器
├── server.js                 # 开发环境服务器
├── stable-server.js          # 稳定版服务器
├── .env.production           # 生产环境配置
├── deploy.sh                 # 自动部署脚本
├── models/                   # 数据模型
├── routes/                   # API 路由
├── middleware/               # 中间件
├── utils/                    # 工具函数
└── database.db              # SQLite 数据库
```

## 🚀 快速部署

### 方法一：自动部署脚本（推荐）

```bash
# 1. 复制文件到 ARM 设备
scp -r backend/ user@armbian-device:/tmp/order-system-backend/

# 2. 在 ARM 设备上执行部署
cd /tmp/order-system-backend
sudo ./deploy.sh
```

### 方法二：手动部署

```bash
# 1. 安装依赖
sudo apt update
sudo apt install -y nodejs npm build-essential better-sqlite3

# 2. 创建应用目录
sudo mkdir -p /opt/order-system-backend
sudo useradd -r -s /bin/false order-system

# 3. 部署应用文件
sudo cp -r * /opt/order-system-backend/
sudo chown -R order-system:order-system /opt/order-system-backend

# 4. 安装 Node.js 依赖
cd /opt/order-system-backend
sudo -u order-system npm ci --production

# 5. better-sqlite3 已通过 apt 安装，无需重新编译

# 6. 创建配置文件
sudo -u order-system cp .env.production .env

# 7. 启动服务
sudo -u order-system node production-server.js
```

## ⚙️ 配置说明

### 环境变量 (.env)

```bash
NODE_ENV=production                 # 环境模式
PORT=3000                          # 服务端口
DB_PATH=/var/lib/order-system/database.db  # 数据库路径
LOG_LEVEL=info                     # 日志级别
LOG_FILE=/var/log/order-system/app.log     # 日志文件
ALLOWED_ORIGINS=http://localhost,http://127.0.0.1  # CORS 允许源
SESSION_SECRET=your-secret-key     # 会话密钥
MAX_CONNECTIONS=100                # 最大连接数
CONNECTION_TIMEOUT=30000           # 连接超时（毫秒）
BACKUP_ENABLED=true                # 启用备份
BACKUP_PATH=/var/backups/order-system      # 备份路径
BACKUP_INTERVAL=86400000           # 备份间隔（毫秒）
```

## 🔧 系统服务配置

### systemd 服务文件

```ini
[Unit]
Description=花馍订单管理系统后端API
After=network.target

[Service]
Type=simple
User=order-system
Group=order-system
WorkingDirectory=/opt/order-system-backend
ExecStart=/usr/bin/node production-server.js
Restart=always
RestartSec=10

# 安全设置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

# ARM 资源限制
MemoryMax=512M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
```

### 服务管理命令

```bash
# 启动服务
sudo systemctl start order-system

# 停止服务
sudo systemctl stop order-system

# 重启服务
sudo systemctl restart order-system

# 查看状态
sudo systemctl status order-system

# 查看日志
sudo journalctl -u order-system -f

# 开机自启
sudo systemctl enable order-system
```

## 🔍 API 接口

### 核心端点

- `GET /health` - 健康检查
- `GET /api` - API 信息
- `GET /api/orders` - 获取订单列表
- `POST /api/orders` - 创建新订单
- `GET /api/goods` - 获取商品目录
- `GET /api/orders/production/:date` - 获取指定日期生产列表

### API 示例

```bash
# 健康检查
curl http://localhost:3000/health

# 获取订单列表
curl http://localhost:3000/api/orders

# 创建订单
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"测试客户","items":[],"deliveryDate":"2025-12-06"}'

# 获取商品目录
curl http://localhost:3000/api/goods
```

## 📊 监控和维护

### 状态检查脚本

```bash
# 运行状态检查
/usr/local/bin/order-system-status.sh
```

输出示例：
```
🚀 花馍订单管理系统后端状态
================================
📱 服务状态: active
🔄 开机启动: enabled
💾 内存使用: 45M/1G
💿 磁盘使用: 24K/100G
📊 数据库大小: 24K
🌐 API 连接测试: ✅ API 服务正常 (HTTP 200)
```

### 数据备份

```bash
# 手动备份
/usr/local/bin/order-system-backup.sh

# 备份输出
数据库备份完成: /var/backups/order-system/database-20251206-143000.db.gz
配置文件备份完成: /var/backups/order-system/config-20251206-143000.env
```

### 日志管理

```bash
# 查看实时日志
sudo tail -f /var/log/order-system/app.log

# 查看 systemd 日志
sudo journalctl -u order-system -f

# 日志轮转配置（已自动配置）
/etc/logrotate.d/order-system
```

## 🔒 安全配置

### 1. 防火墙设置

```bash
# UFW 防火墙
sudo ufw allow 3000/tcp
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

### 2. 反向代理（推荐）

#### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/order-system-frontend;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Caddy 配置

```caddy
your-domain.com {
    root * /var/www/order-system-frontend
    file_server

    # API 代理
    reverse_proxy /api/* localhost:3000

    # SPA 支持
    try_files {path} {path}/ /index.html
}
```

## 🛠️ 故障排除

### 常见问题

1. **服务启动失败**
   ```bash
   # 检查日志
   sudo journalctl -u order-system -n 50

   # 检查配置
   node -c production-server.js
   ```

2. **数据库连接错误**
   ```bash
   # 检查数据库文件权限
   ls -la /var/lib/order-system/database.db

   # 修复权限
   sudo chown order-system:order-system /var/lib/order-system/database.db
   ```

3. **端口占用**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep :3000

   # 释放端口
   sudo lsof -ti:3000 | xargs kill -9
   ```

4. **better-sqlite3 模块错误**
   ```bash
   # 如果使用 apt 安装的 better-sqlite3，检查是否正确安装
   apt install --reinstall better-sqlite3

   # 或者检查 npm 版本
   cd /opt/order-system-backend
   sudo -u order-system npm rebuild better-sqlite3
   ```

### 性能优化

1. **内存优化**（ARM 设备）
   ```bash
   # 调整 Node.js 内存限制
   echo "NODE_OPTIONS=--max-old-space-size=256" >> /etc/environment
   ```

2. **SQLite 优化**
   ```sql
   PRAGMA journal_mode = WAL;
   PRAGMA synchronous = NORMAL;
   PRAGMA cache_size = 10000;
   ```

## 📦 部署包内容

### 必需文件
- `production-server.js` - 生产服务器
- `.env.production` - 生产配置模板
- `deploy.sh` - 自动部署脚本
- `package.json` - 依赖配置
- `package-lock.json` - 锁定依赖版本

### 目录结构
- `models/` - 数据模型
- `routes/` - API 路由
- `middleware/` - 中间件
- `utils/` - 工具函数

### 可选文件
- `database.db` - 开发环境数据库（生产环境会新建）
- 各种测试脚本和工具

## 🚀 部署验证

部署完成后，运行以下验证：

```bash
# 1. 服务状态检查
sudo systemctl status order-system

# 2. 健康检查
curl http://localhost:3000/health

# 3. API 测试
curl http://localhost:3000/api

# 4. 数据库连接测试
curl http://localhost:3000/api/orders

# 5. 完整状态报告
/usr/local/bin/order-system-status.sh
```

全部通过即表示部署成功！