#!/bin/bash

# 花馍订单管理系统 - 后端部署脚本
# 适用于 Armbian 系统 (ARM 架构)

set -e

echo "🚀 开始部署花馍订单管理系统后端..."

# 配置变量
APP_NAME="order-system-backend"
APP_USER="order-system"
APP_DIR="/opt/$APP_NAME"
SERVICE_NAME="order-system"
DATA_DIR="/var/lib/order-system"
LOG_DIR="/var/log/order-system"
BACKUP_DIR="/var/backups/order-system"

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

# 检查 Node.js 版本
echo "📋 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    echo "✅ Node.js 版本: $NODE_VERSION"
fi

# 安装系统依赖
echo "📦 安装系统依赖..."
apt-get update
apt-get install -y curl better-sqlite3

# 创建应用用户
echo "👤 创建应用用户..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/false -d "$APP_DIR" "$APP_USER"
    echo "✅ 用户 $APP_USER 创建成功"
else
    echo "✅ 用户 $APP_USER 已存在"
fi

# 创建目录结构
echo "📁 创建目录结构..."
mkdir -p "$APP_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "/etc/$APP_NAME"

# 设置目录权限
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$DATA_DIR"
chown -R "$APP_USER:$APP_USER" "$LOG_DIR"
chown -R "$APP_USER:$APP_USER" "$BACKUP_DIR"
chmod 755 "$APP_DIR"
chmod 755 "$DATA_DIR"
chmod 755 "$LOG_DIR"
chmod 755 "$BACKUP_DIR"

# 复制应用文件
echo "📋 部署应用文件..."
cp -r * "$APP_DIR/"
rm -f "$APP_DIR/deploy.sh"  # 移除部署脚本

# 重新设置文件权限（重要：复制后需要重新设置所有权）
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 755 "$APP_DIR"
find "$APP_DIR" -type f -name "*.js" -exec chmod 644 {} \;
find "$APP_DIR" -type f -name "*.json" -exec chmod 644 {} \;

# 安装 Node.js 依赖（只安装一次，检测到更新时重新安装）
echo "📦 检查并安装 Node.js 依赖..."
cd "$APP_DIR"

# 检查是否需要重新安装依赖
if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
    echo "📦 检测到依赖更新，重新安装..."
    sudo -u "$APP_USER" npm ci --production --no-optional
else
    echo "✅ 依赖已存在且最新，跳过安装"
fi

# 创建生产环境配置
echo "⚙️  创建生产环境配置..."
cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
PORT=3000
DB_PATH=$DATA_DIR/database.db
LOG_LEVEL=info
LOG_FILE=$LOG_DIR/app.log
ALLOWED_ORIGINS=http://localhost,http://127.0.0.1
SESSION_SECRET=$(openssl rand -hex 32)
MAX_CONNECTIONS=100
CONNECTION_TIMEOUT=30000
BACKUP_ENABLED=true
BACKUP_PATH=$BACKUP_DIR
BACKUP_INTERVAL=86400000
EOF

# 设置配置文件权限
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# 初始化数据库（如果不存在）
echo "💾 初始化数据库..."
if [ ! -f "$DATA_DIR/database.db" ]; then
    # 如果开发环境有数据库，复制过去
    if [ -f "database.db" ]; then
        cp database.db "$DATA_DIR/database.db"
        chown "$APP_USER:$APP_USER" "$DATA_DIR/database.db"
        echo "✅ 数据库已复制"
    else
        # 创建空数据库
        sudo -u "$APP_USER" touch "$DATA_DIR/database.db"
        echo "✅ 空数据库已创建"
    fi
else
    echo "✅ 数据库已存在"
fi

# 创建 systemd 服务
echo "🔧 创建系统服务..."
cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=花馍订单管理系统后端API
Documentation=https://github.com/your-repo/order-system
After=network.target
Wants=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node production-server.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# 环境变量
Environment=NODE_ENV=production

# 安全设置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR $LOG_DIR $BACKUP_DIR

# 资源限制（ARM 优化）
LimitNOFILE=65535
MemoryMax=512M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
EOF

# 重新加载 systemd
systemctl daemon-reload

# 创建日志轮转配置
echo "📝 配置日志轮转..."
cat > "/etc/logrotate.d/$SERVICE_NAME" << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        systemctl reload $SERVICE_NAME || true
    endscript
}
EOF

# 创建备份脚本
echo "💾 创建备份脚本..."
cat > "/usr/local/bin/$SERVICE_NAME-backup.sh" << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/order-system"
DATA_DIR="/var/lib/order-system"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# 创建数据库备份
if [ -f "$DATA_DIR/database.db" ]; then
    cp "$DATA_DIR/database.db" "$BACKUP_DIR/database-$TIMESTAMP.db"
    gzip "$BACKUP_DIR/database-$TIMESTAMP.db"
    echo "数据库备份完成: $BACKUP_DIR/database-$TIMESTAMP.db.gz"
fi

# 清理旧备份（保留30天）
find "$BACKUP_DIR" -name "database-*.db.gz" -mtime +30 -delete

# 备份配置文件
cp /opt/order-system-backend/.env "$BACKUP_DIR/config-$TIMESTAMP.env"
echo "配置文件备份完成: $BACKUP_DIR/config-$TIMESTAMP.env"
EOF

chmod +x "/usr/local/bin/$SERVICE_NAME-backup.sh"

# 创建监控脚本
echo "📊 创建监控脚本..."
cat > "/usr/local/bin/$SERVICE_NAME-status.sh" << EOF
#!/bin/bash

echo "🚀 花馍订单管理系统后端状态"
echo "================================"
echo "📱 服务状态: \$(systemctl is-active $SERVICE_NAME)"
echo "🔄 开机启动: \$(systemctl is-enabled $SERVICE_NAME)"
echo "💾 内存使用: \$(free -h | grep Mem | awk '{print \$3"/"\$2}')"
echo "💿 磁盘使用: \$(df -h $DATA_DIR | tail -1 | awk '{print \$3"/"\$2" ("\$5")"}')"
echo "📊 数据库大小: \$(du -sh $DATA_DIR/database.db 2>/dev/null | cut -f1 || echo '不存在')"
echo ""
echo "🌐 API 连接测试:"
API_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "连接失败")
if [ "\$API_STATUS" = "200" ]; then
    echo "✅ API 服务正常 (HTTP 200)"
else
    echo "❌ API 服务异常 (HTTP \$API_STATUS)"
fi
echo ""
echo "📋 最近日志 (最后5行):"
journalctl -u $SERVICE_NAME --no-pager -n 5 --since "5 minutes ago" 2>/dev/null || echo "无最近日志"
echo "================================"
EOF

chmod +x "/usr/local/bin/$SERVICE_NAME-status.sh"

# 启用并启动服务
echo "🚀 启动服务..."
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 验证部署
echo "✅ 验证部署..."
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ 系统服务运行正常"
else
    echo "❌ 系统服务启动失败"
    echo "错误日志:"
    journalctl -u "$SERVICE_NAME" --no-pager -n 20
    exit 1
fi

# 测试 API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "连接失败")
if [ "$API_STATUS" = "200" ]; then
    echo "✅ API 服务运行正常"
else
    echo "❌ API 服务异常 (HTTP $API_STATUS)"
    echo "请检查日志: journalctl -u $SERVICE_NAME -f"
    exit 1
fi

echo ""
echo "🎉 后端部署完成！"
echo ""
echo "📋 部署信息:"
echo "   应用目录: $APP_DIR"
echo "   数据目录: $DATA_DIR"
echo "   日志目录: $LOG_DIR"
echo "   备份目录: $BACKUP_DIR"
echo "   服务名称: $SERVICE_NAME"
echo "   API 地址: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "🔧 管理命令:"
echo "   查看状态: $SERVICE_NAME-status.sh"
echo "   重启服务: systemctl restart $SERVICE_NAME"
echo "   查看日志: journalctl -u $SERVICE_NAME -f"
echo "   备份数据: $SERVICE_NAME-backup.sh"
echo "   编辑配置: nano $APP_DIR/.env"
echo ""
echo "⚠️  注意事项:"
echo "   1. 请确保防火墙允许 3000 端口"
echo "   2. 定期备份数据库: $SERVICE_NAME-backup.sh"
echo "   3. 监控服务状态: $SERVICE_NAME-status.sh"
echo "   4. 建议配置反向代理 (Nginx/Caddy)"