#!/bin/bash

# 创建排除数据库和node_modules的压缩包
echo "创建压缩包..."
tar --exclude='database.db*' \
    --exclude='node_modules' \
    --exclude='.claude' \
    --exclude='*.pid' \
    --exclude='*.log' \
    --exclude='temp' \
    --exclude='logs' \
    --exclude='backups' \
    --exclude='transfer_*' \
    -czf backend-files.tar.gz .

echo "压缩包创建完成: backend-files.tar.gz"
echo "请手动执行以下命令传输文件："
echo "scp backend-files.tar.gz root@192.168.0.110:/opt/"
echo ""
echo "然后在目标服务器上执行："
echo "ssh root@192.168.0.110"
echo "cd /opt"
echo "mkdir -p order-system-backend"
echo "tar -xzf backend-files.tar.gz -C order-system-backend/"
echo "rm backend-files.tar.gz"

echo chown -R "order-system:order-system" "/opt/order-system-backend"