#!/bin/bash

# 花馍订单管理系统 - 前端部署脚本
# 适用于 Armbian 系统 (ARM 架构)

set -e

echo "🌸 开始部署花馍订单管理系统前端..."

# 配置变量
APP_NAME="order-system-frontend"
DEPLOY_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
SERVICE_NAME="nginx"

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 权限运行此脚本"
    exit 1
fi

# 检查系统架构
ARCH=$(uname -m)
echo "🔍 检测到系统架构: $ARCH"

if [[ "$ARCH" != "aarch64" && "$ARCH" != "armv7l" && "$ARCH" != "arm64" ]]; then
    echo "⚠️  警告: 当前不是 ARM 架构 ($ARCH)，但部署仍可继续"
fi

# 安装必要的系统依赖
echo "📦 安装系统依赖..."
apt-get update
apt-get install -y nginx curl

# 创建部署目录
echo "📁 创建部署目录..."
mkdir -p "$DEPLOY_DIR"
mkdir -p "$BACKUP_DIR"

# 备份现有部署（如果存在）
if [ -d "$DEPLOY_DIR/dist" ]; then
    echo "💾 备份现有部署..."
    BACKUP_NAME="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$DEPLOY_DIR" "$BACKUP_NAME"
fi

# 部署新的构建文件
echo "🚀 部署新构建文件..."
cp -r dist/* "$DEPLOY_DIR/"

# 设置文件权限
echo "🔐 设置文件权限..."
chown -R www-data:www-data "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR"

# 创建 Nginx 配置
echo "⚙️  配置 Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << 'EOF'
server {
    listen 80;
    server_name localhost;

    root /var/www/order-system-frontend;
    index index.html;

    # 启用 gzip 压缩（ARM 优化）
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API 代理到后端
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 安全头设置
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
echo "🧪 测试 Nginx 配置..."
nginx -t

# 重启 Nginx
echo "🔄 重启 Nginx..."
systemctl restart nginx
systemctl enable nginx

# 创建系统服务监控脚本
echo "📊 创建监控脚本..."
cat > /usr/local/bin/$APP_NAME-status.sh << 'EOF'
#!/bin/bash

echo "🌸 花馍订单管理系统状态检查"
echo "================================"
echo "📱 前端服务: $(systemctl is-active nginx)"
echo "🌐 访问地址: http://$(hostname -I | awk '{print $1}')"
echo "💾 磁盘使用: $(du -sh /var/www/order-system-frontend 2>/dev/null || echo '未部署')"
echo "🔗 API 连接: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo '无法连接')"
echo "================================"
EOF

chmod +x /usr/local/bin/$APP_NAME-status.sh

# 验证部署
echo "✅ 验证部署..."
if [ -f "$DEPLOY_DIR/index.html" ]; then
    echo "✅ 前端文件部署成功"
else
    echo "❌ 前端文件部署失败"
    exit 1
fi

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx 服务运行正常"
else
    echo "❌ Nginx 服务启动失败"
    exit 1
fi

echo ""
echo "🎉 部署完成！"
echo ""
echo "📋 部署信息:"
echo "   部署目录: $DEPLOY_DIR"
echo "   备份目录: $BACKUP_DIR"
echo "   访问地址: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "🔧 管理命令:"
echo "   查看状态: $APP_NAME-status.sh"
echo "   重启服务: systemctl restart nginx"
echo "   查看日志: journalctl -u nginx -f"
echo ""
echo "⚠️  注意事项:"
echo "   1. 请确保后端服务运行在 http://localhost:3000"
echo "   2. 如需修改域名，请编辑 /etc/nginx/sites-available/$APP_NAME"
echo "   3. 建议定期备份部署文件"