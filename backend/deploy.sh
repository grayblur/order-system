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

# 权限检查函数
check_directory_permissions() {
    local dir_path="$1"
    local dir_name="$2"

    echo "🔍 检查 $dir_name 目录权限..."

    # 检查父目录是否存在和可写
    local parent_dir=$(dirname "$dir_path")

    if [ ! -d "$parent_dir" ]; then
        echo "❌ 父目录不存在: $parent_dir"
        return 1
    fi

    if [ ! -w "$parent_dir" ]; then
        echo "⚠️  父目录不可写: $parent_dir"
        echo "   当前用户: $(whoami)"
        echo "   父目录权限: $(ls -ld "$parent_dir")"
        return 1
    fi

    echo "✅ $dir_name 目录权限检查通过"
    return 0
}

# 检查系统架构
ARCH=$(uname -m)
echo "🔍 检测到系统架构: $ARCH"

if [[ "$ARCH" != "aarch64" && "$ARCH" != "armv7l" && "$ARCH" != "arm64" ]]; then
    echo "⚠️  警告: 当前不是 ARM 架构 ($ARCH)，但部署仍可继续"
fi

# 检查 Node.js 版本
echo "📋 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    echo "✅ 当前 Node.js 版本: $NODE_VERSION"

    # 检查版本是否满足要求（需要 Node.js 18+）
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo "⚠️  Node.js 版本过低，需要 18+ 版本"
        echo "🔄 升级 Node.js 到 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs --upgrade
        echo "✅ Node.js 升级完成: $(node -v)"
    fi
fi

# 检查 npm 版本
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "✅ npm 版本: $NPM_VERSION"
else
    echo "❌ npm 未安装"
    exit 1
fi

# 安装系统依赖
echo "📦 安装系统依赖..."
apt-get update
apt-get install -y curl sqlite3 build-essential python3 make g++

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

# 检查并创建各个目录
if ! check_directory_permissions "$APP_DIR" "应用"; then
    echo "❌ 无法创建应用目录"
    exit 1
fi
mkdir -p "$APP_DIR"

if ! check_directory_permissions "$DATA_DIR" "数据"; then
    echo "❌ 无法创建数据目录"
    exit 1
fi
mkdir -p "$DATA_DIR"

# 特殊处理 /var/log 目录 - 确保有正确的权限
if [ ! -d "$LOG_DIR" ]; then
    echo "📝 创建日志目录: $LOG_DIR"

    # 检查父目录权限
    if check_directory_permissions "$LOG_DIR" "日志"; then
        mkdir -p "$LOG_DIR"
        echo "✅ 日志目录创建成功"
    else
        echo "⚠️  权限检查失败，尝试使用 sudo 创建..."
        sudo mkdir -p "$LOG_DIR"
        if [ $? -eq 0 ]; then
            echo "✅ 使用 sudo 创建日志目录成功"
        else
            echo "❌ 无法创建日志目录，请手动检查权限"
            exit 1
        fi
    fi
else
    echo "✅ 日志目录已存在: $LOG_DIR"
fi

if ! check_directory_permissions "$BACKUP_DIR" "备份"; then
    echo "❌ 无法创建备份目录"
    exit 1
fi
mkdir -p "$BACKUP_DIR"

mkdir -p "/etc/$APP_NAME"

# 设置目录权限
echo "🔐 设置目录权限..."
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$DATA_DIR"

# 特殊处理日志目录权限
if [ -d "$LOG_DIR" ]; then
    chown -R "$APP_USER:$APP_USER" "$LOG_DIR"
    chmod 755 "$LOG_DIR"
    echo "✅ 日志目录权限设置完成"
else
    echo "❌ 日志目录创建失败"
    exit 1
fi

chown -R "$APP_USER:$APP_USER" "$BACKUP_DIR"
chmod 755 "$APP_DIR"
chmod 755 "$DATA_DIR"
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

# 安装 Node.js 依赖
echo "📦 安装 Node.js 依赖..."
cd "$APP_DIR"

# 设置 npm 配置（ARM 架构优化）
echo "⚙️ 配置 npm 设置..."
if [[ "$ARCH" == "aarch64" || "$ARCH" == "armv7l" || "$ARCH" == "arm64" ]]; then
    sudo -u "$APP_USER" npm config set registry https://registry.npmmirror.com
    echo "✅ 使用中国镜像源 (ARM 优化)"
fi

# 清理可能存在的旧依赖
if [ -d "node_modules" ]; then
    echo "🧹 清理旧依赖..."
    rm -rf node_modules
fi

# 安装依赖（包含开发依赖，用于构建 better-sqlite3）
echo "📦 安装项目依赖..."
if sudo -u "$APP_USER" npm install --legacy-peer-deps; then
    echo "✅ 依赖安装成功"
else
    echo "❌ 依赖安装失败，尝试备用方案..."
    # 备用安装方案
    sudo -u "$APP_USER" npm install --production --legacy-peer-deps --no-optional
fi

# 验证关键依赖是否安装成功
echo "🔍 验证依赖..."
if sudo -u "$APP_USER" node -e "require('better-sqlite3')" 2>/dev/null; then
    echo "✅ better-sqlite3 安装成功"
else
    echo "❌ better-sqlite3 安装失败，尝试重新编译..."
    sudo -u "$APP_USER" npm rebuild better-sqlite3 --runtime=node
fi

# 创建生产环境配置
echo "⚙️ 创建生产环境配置..."
# 先检查是否已有生产配置文件
if [ -f "$APP_DIR/.env.production" ]; then
    echo "📋 发现现有生产配置，基于其创建配置..."
    cp "$APP_DIR/.env.production" "$APP_DIR/.env"
else
    cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
PORT=3000
DB_PATH=$DATA_DIR/database.db
LOG_LEVEL=info
LOG_FILE=$LOG_DIR/app.log
ALLOWED_ORIGINS=http://localhost,http://127.0.0.1,http://$(hostname -I | awk '{print $1}'):5173
SESSION_SECRET=$(openssl rand -hex 32)
MAX_CONNECTIONS=100
CONNECTION_TIMEOUT=30000
BACKUP_ENABLED=true
BACKUP_PATH=$BACKUP_DIR
BACKUP_INTERVAL=86400000
EOF
fi

# 更新配置中的路径
sed -i "s|DB_PATH=.*|DB_PATH=$DATA_DIR/database.db|g" "$APP_DIR/.env"
sed -i "s|LOG_FILE=.*|LOG_FILE=$LOG_DIR/app.log|g" "$APP_DIR/.env"
sed -i "s|BACKUP_PATH=.*|BACKUP_PATH=$BACKUP_DIR|g" "$APP_DIR/.env"

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
EnvironmentFile=$APP_DIR/.env

# 启动前创建必要目录（解决重启后目录被删除的问题）
# 使用 + 前缀以 root 权限执行，解决权限问题
ExecStartPre=+/bin/mkdir -p $DATA_DIR
ExecStartPre=+/bin/mkdir -p $LOG_DIR
ExecStartPre=+/bin/mkdir -p $BACKUP_DIR
ExecStartPre=+/bin/chown -R $APP_USER:$APP_USER $DATA_DIR
ExecStartPre=+/bin/chown -R $APP_USER:$APP_USER $LOG_DIR
ExecStartPre=+/bin/chown -R $APP_USER:$APP_USER $BACKUP_DIR
ExecStartPre=+/bin/chmod 755 $LOG_DIR

# 安全设置
#NoNewPrivileges=true
#PrivateTmp=true
#ProtectSystem=strict
#ProtectHome=true
#ReadWritePaths=$DATA_DIR $LOG_DIR $BACKUP_DIR

# 资源限制（ARM 优化）
LimitNOFILE=65535
MemoryMax=512M
CPUQuota=50%

# 超时设置
TimeoutStartSec=60
TimeoutStopSec=30

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

# 等待服务完全启动
echo "⏳ 等待服务完全启动..."
for i in {1..30}; do
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo "✅ 系统服务启动成功"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ 系统服务启动超时"
        echo "错误日志:"
        journalctl -u "$SERVICE_NAME" --no-pager -n 50
        exit 1
    fi
    sleep 2
    echo "   等待中... ($i/30)"
done

# 测试 API 健康检查
echo "🔍 测试 API 健康检查..."
for i in {1..10}; do
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "连接失败")
    if [ "$API_STATUS" = "200" ]; then
        echo "✅ API 服务运行正常 (HTTP 200)"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ API 服务健康检查失败 (HTTP $API_STATUS)"
        echo "📋 服务状态信息:"
        systemctl status "$SERVICE_NAME" --no-pager -l
        echo ""
        echo "📋 最近错误日志:"
        journalctl -u "$SERVICE_NAME" --no-pager -n 30 --since "2 minutes ago"
        echo ""
        echo "🔧 故障排除建议:"
        echo "   1. 检查端口占用: netstat -tlnp | grep 3000"
        echo "   2. 手动启动测试: sudo -u $APP_USER node production-server.js"
        echo "   3. 检查配置文件: cat $APP_DIR/.env"
        echo "   4. 查看详细日志: journalctl -u $SERVICE_NAME -f"
        exit 1
    fi
    sleep 3
    echo "   健康检查中... ($i/10)"
done

# 验证数据库连接
echo "💾 验证数据库连接..."
if [ -f "$DATA_DIR/database.db" ]; then
    DB_SIZE=$(du -sh "$DATA_DIR/database.db" | cut -f1)
    echo "✅ 数据库文件存在，大小: $DB_SIZE"
else
    echo "⚠️ 数据库文件不存在，将在首次启动时创建"
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