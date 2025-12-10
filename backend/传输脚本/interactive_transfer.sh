#!/bin/bash

echo "=== 后端文件传输脚本 ==="
echo "目标服务器: root@192.168.0.110:/opt/order-system-backend/"
echo "密码: 123456"
echo ""

# 创建目标目录
echo "1. 创建目标目录..."
ssh root@192.168.0.110 "mkdir -p /opt/order-system-backend"

if [ $? -eq 0 ]; then
    echo "✓ 目标目录创建成功"
else
    echo "✗ 目标目录创建失败，请检查连接"
    exit 1
fi

echo ""
echo "2. 传输压缩包..."
scp backend-files.tar.gz root@192.168.0.110:/opt/

if [ $? -eq 0 ]; then
    echo "✓ 压缩包传输成功"
else
    echo "✗ 压缩包传输失败"
    exit 1
fi

echo ""
echo "3. 在目标服务器上解压..."
ssh root@192.168.0.110 "cd /opt && tar -xzf backend-files.tar.gz -C order-system-backend/ && rm backend-files.tar.gz"

if [ $? -eq 0 ]; then
    echo "✓ 解压完成"
else
    echo "✗ 解压失败"
    exit 1
fi

echo ""
echo "=== 传输完成! ==="
echo "文件已传输到: /opt/order-system-backend/"
echo ""
echo "接下来需要在目标服务器上:"
echo "1. cd /opt/order-system-backend"
echo "2. npm install --production"
echo "3. node production-server.js"