#!/bin/bash

# 花馍订单管理系统 - 后端卸载脚本
# 完全移除系统中的所有相关组件

set -e

echo "🗑️ 开始卸载花馍订单管理系统后端..."

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

# 确认卸载操作
echo ""
echo "⚠️ 警告：此操作将完全删除花馍订单管理系统后端，包括："
echo "   - 应用文件 ($APP_DIR)"
echo "   - 系统服务 ($SERVICE_NAME)"
echo "   - 数据文件 ($DATA_DIR)"
echo "   - 日志文件 ($LOG_DIR)"
echo "   - 备份文件 ($BACKUP_DIR)"
echo "   - 应用用户 ($APP_USER)"
echo ""
read -p "确认要继续吗？(输入 'yes' 确认): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ 卸载操作已取消"
    exit 1
fi

# 停止并禁用服务
echo "🛑 停止系统服务..."
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    systemctl stop "$SERVICE_NAME"
    echo "✅ 服务已停止"
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    systemctl disable "$SERVICE_NAME"
    echo "✅ 服务已禁用"
fi

# 删除 systemd 服务文件
echo "🗂️ 删除系统服务配置..."
if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
    rm -f "/etc/systemd/system/$SERVICE_NAME.service"
    systemctl daemon-reload
    echo "✅ 服务配置已删除"
fi

# 删除日志轮转配置
if [ -f "/etc/logrotate.d/$SERVICE_NAME" ]; then
    rm -f "/etc/logrotate.d/$SERVICE_NAME"
    echo "✅ 日志轮转配置已删除"
fi

# 删除管理脚本
echo "🗑️ 删除管理脚本..."
rm -f "/usr/local/bin/$SERVICE_NAME-backup.sh"
rm -f "/usr/local/bin/$SERVICE_NAME-status.sh"
echo "✅ 管理脚本已删除"

# 备份数据库（可选）
if [ -f "$DATA_DIR/database.db" ]; then
    echo ""
    read -p "是否要备份数据库文件？(y/n): " backup_db
    if [ "$backup_db" = "y" ] || [ "$backup_db" = "Y" ]; then
        BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
        BACKUP_FILE="/tmp/order-system-backup-$BACKUP_TIMESTAMP.db.gz"
        cp "$DATA_DIR/database.db" "/tmp/order-system-backup-$BACKUP_TIMESTAMP.db"
        gzip "/tmp/order-system-backup-$BACKUP_TIMESTAMP.db"
        echo "✅ 数据库已备份到: $BACKUP_FILE"
    fi
fi

# 删除应用目录
echo "🗑️ 删除应用文件..."
if [ -d "$APP_DIR" ]; then
    rm -rf "$APP_DIR"
    echo "✅ 应用目录已删除"
fi

# 删除数据目录
echo "🗑️ 删除数据文件..."
if [ -d "$DATA_DIR" ]; then
    rm -rf "$DATA_DIR"
    echo "✅ 数据目录已删除"
fi

# 删除日志目录
echo "🗑️ 删除日志文件..."
if [ -d "$LOG_DIR" ]; then
    rm -rf "$LOG_DIR"
    echo "✅ 日志目录已删除"
fi

# 删除备份目录
echo "🗑️ 删除备份文件..."
if [ -d "$BACKUP_DIR" ]; then
    rm -rf "$BACKUP_DIR"
    echo "✅ 备份目录已删除"
fi

# 删除配置目录
if [ -d "/etc/$APP_NAME" ]; then
    rm -rf "/etc/$APP_NAME"
    echo "✅ 配置目录已删除"
fi

# 删除应用用户
echo "👤 删除应用用户..."
if id "$APP_USER" &>/dev/null; then
    userdel "$APP_USER" 2>/dev/null || true
    groupdel "$APP_USER" 2>/dev/null || true
    echo "✅ 应用用户已删除"
fi

# 清理 systemd 缓存
echo "🧹 清理系统缓存..."
systemctl daemon-reload
systemctl reset-failed "$SERVICE_NAME" 2>/dev/null || true

# 清理临时文件
echo "🧹 清理临时文件..."
rm -rf /tmp/order-system-backup-* 2>/dev/null || true

echo ""
echo "🎉 花馍订单管理系统后端卸载完成！"
echo ""
echo "📋 卸载摘要:"
echo "   ✅ 系统服务已停止并删除"
echo "   ✅ 应用文件已删除"
echo "   ✅ 数据文件已删除"
echo "   ✅ 日志文件已删除"
echo "   ✅ 备份文件已删除"
echo "   ✅ 应用用户已删除"
echo "   ✅ 配置文件已删除"
echo ""
if [ -f "$BACKUP_FILE" ]; then
    echo "💾 数据库备份文件: $BACKUP_FILE"
    echo "   请妥善保管此文件，如需恢复可以联系技术支持"
    echo ""
fi
echo "✅ 系统已清理干净"