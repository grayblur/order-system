# 前端静态文件服务器部署方案

## 方案一：Nginx（推荐）

### 优势
- 高性能，特别适合 ARM 架构
- 内置缓存和压缩
- 支持反向代理
- 配置简单

### 部署步骤
```bash
# 1. 使用提供的部署脚本
sudo ./deploy.sh

# 2. 或手动配置
sudo apt install nginx
sudo cp -r dist/* /var/www/html/
sudo systemctl restart nginx
```

## 方案二：Caddy（轻量级）

### 优势
- 自动 HTTPS
- 配置简单
- 内存占用小
- 适合资源有限的 ARM 设备

### 安装配置
```bash
# 安装 Caddy
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Caddyfile 配置
echo "localhost {
    root * /var/www/order-system-frontend
    file_server
    encode gzip zstd

    # API 代理
    reverse_proxy /api/* localhost:3000

    # SPA 支持
    try_files {path} {path}/ /index.html
}" > /etc/caddy/Caddyfile

# 启动服务
sudo systemctl enable caddy
sudo systemctl start caddy
```

## 方案三：Node.js 服务器

### 优势
- 与现有 Node.js 生态集成
- 灵活的自定义逻辑
- 适合需要特殊处理的场景

### 简单服务器代码
```javascript
// production-server.js
const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = 80;

// 中间件
app.use(compression());
app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '1y'
}));

// API 代理（如果需要）
const { createProxyMiddleware } = require('http-proxy-middleware');
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true
}));

// SPA 支持
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
```

## 方案四：Apache HTTP Server

### 优势
- 传统稳定
- 模块丰富
- 适合有 Apache 经验的管理员

### 配置示例
```apache
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot /var/www/order-system-frontend

    # 启用压缩
    LoadModule deflate_module modules/mod_deflate.so
    <Location />
        SetOutputFilter DEFLATE
        SetEnvIfNoCase Request_URI \
            \.(?:gif|jpe?g|png)$ no-gzip dont-vary
        SetEnvIfNoCase Request_URI \
            \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
    </Location>

    # API 代理
    ProxyPass /api/ http://localhost:3000/
    ProxyPassReverse /api/ http://localhost:3000/

    # SPA 支持
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</VirtualHost>
```

## 性能优化建议（ARM 架构）

### 1. 启用压缩
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/javascript;
```

### 2. 静态资源缓存
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 连接优化
```nginx
worker_connections 1024;
keepalive_timeout 65;
```

### 4. 内存限制（ARM 重要）
```nginx
worker_processes auto;
worker_rlimit_nofile 65535;
```

## 监控和维护

### 1. 健康检查脚本
```bash
#!/bin/bash
# health-check.sh
curl -f http://localhost:80/ || exit 1
curl -f http://localhost:3000/health || exit 1
```

### 2. 日志监控
```bash
# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 系统资源监控
htop
iotop
```

### 3. 自动重启配置
```bash
# 创建 systemd 服务
sudo systemctl enable nginx
sudo systemctl enable caddy  # 如果使用 Caddy
```

## 推荐选择

对于 Armbian 系统，推荐顺序：

1. **Nginx** - 最佳性能和功能平衡
2. **Caddy** - 简单易用，自动 HTTPS
3. **Node.js** - 需要自定义逻辑时
4. **Apache** - 传统环境或特殊需求

选择主要考虑：
- 服务器性能（ARM 资源限制）
- 管理员熟悉程度
- 特殊功能需求（如自动 HTTPS）
- 维护复杂度