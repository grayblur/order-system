#!/bin/bash

# 简单的备份测试脚本

set -euo pipefail

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="$PROJECT_ROOT/../database.db"
TEMP_DIR="$PROJECT_ROOT/temp"
BACKUP_DATE=$(date +%Y-%m-%d_%H-%M-%S)

echo "数据库路径: $DB_PATH"
echo "临时目录: $TEMP_DIR"

# 检查数据库文件
if [ ! -f "$DB_PATH" ]; then
    echo "错误: 数据库文件不存在: $DB_PATH"
    exit 1
fi

# 创建临时目录
mkdir -p "$TEMP_DIR"

# 复制数据库文件
backup_filename="${BACKUP_DATE}_database.db"
backup_path="$TEMP_DIR/$backup_filename"

echo "创建备份: $backup_path"
cp "$DB_PATH" "$backup_path"

# 验证备份
if [ -f "$backup_path" ]; then
    echo "备份成功创建!"
    ls -lh "$backup_path"
else
    echo "备份创建失败!"
    exit 1
fi

# 压缩备份
echo "压缩备份文件..."
gzip -c "$backup_path" > "$backup_path.gz"
rm "$backup_path"

if [ -f "$backup_path.gz" ]; then
    echo "压缩备份成功!"
    ls -lh "$backup_path.gz"
else
    echo "压缩失败!"
    exit 1
fi

echo "测试完成!"