#!/bin/bash

# 创建要传输的文件列表
FILES=(
    "check-payment-status.js"
    "fix-order-13.js"
    "fix-payment-status.js"
    "deploy.sh"
    ".env.production"
    "package.json"
    "Dockerfile.dev"
    "uninstall.sh"
    "test-production.js"
    "test-frontend-loading.js"
    "check-latest-orders.js"
    "simple-server.js"
    "production-server.js"
    "README-DEPLOYMENT.md"
    ".gitignore"
    "create-test-orders.js"
    ".env"
    "package-lock.json"
    "server.js"
    "test-server.js"
    "stable-server.js"
    "test-order-flow.js"
)

# 要传输的目录
DIRS=("models" "routes" "services" "utils" "resources")

# 目标服务器信息
SERVER="root@192.168.0.110"
TARGET_DIR="/opt/order-system-backend"
PASSWORD="123456"

echo "开始传输文件到 $SERVER:$TARGET_DIR"

# 创建目标目录
echo "创建目标目录..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "mkdir -p $TARGET_DIR"

# 传输单个文件
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "传输文件: $file"
        sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no "$file" "$SERVER:$TARGET_DIR/"
    fi
done

# 传输目录
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "传输目录: $dir"
        sshpass -p "$PASSWORD" scp -r -o StrictHostKeyChecking=no "$dir" "$SERVER:$TARGET_DIR/"
    fi
done

echo "文件传输完成！"