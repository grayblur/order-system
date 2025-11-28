#!/bin/bash

echo "启动花馍订单管理系统开发环境..."

# 检查并关闭已有的开发服务器
echo "检查已有的开发服务器..."
pkill -f "vite\|node.*server" 2>/dev/null || true

# 等待进程完全关闭
sleep 2

# 检查端口占用
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "端口 5173 被占用，正在释放..."
    kill -9 $(lsof -Pi :5173 -sTCP:LISTEN -t) 2>/dev/null || true
    sleep 1
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "端口 3000 被占用，正在释放..."
    kill -9 $(lsof -Pi :3000 -sTCP:LISTEN -t) 2>/dev/null || true
    sleep 1
fi

# 启动后端服务器
echo "启动后端服务器..."
cd backend
node stable-server.js &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端开发服务器
echo "启动前端开发服务器..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "开发环境已启动！"
echo "后端服务器 PID: $BACKEND_PID (端口: 3000)"
echo "前端开发服务器 PID: $FRONTEND_PID (端口: 5173)"
echo ""
echo "访问应用: http://localhost:5173"
echo "API 接口: http://localhost:3000"
echo "健康检查: http://localhost:3000/health"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap 'echo "正在停止开发服务器..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo "所有服务已停止"; exit 0' INT

wait