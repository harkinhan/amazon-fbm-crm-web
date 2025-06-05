#!/bin/bash

# Amazon FBM CRM System LAN Startup Script
# 亚马逊FBM订单管理系统局域网启动脚本

echo "🌐 启动亚马逊FBM订单管理系统 (局域网模式)..."
echo "=================================================="

# Get local IP address
LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)

if [ -z "$LOCAL_IP" ]; then
    # Alternative method for getting IP
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
fi

if [ -z "$LOCAL_IP" ]; then
    echo "⚠️  无法自动获取本机IP地址，请手动查看网络设置"
    LOCAL_IP="你的IP地址"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "📦 安装后端依赖..."
cd server
npm install
echo "✅ 后端依赖安装完成"

echo "📦 安装前端依赖..."
cd ../client
npm install
echo "✅ 前端依赖安装完成"

echo "🔧 启动后端服务器 (端口 3001)..."
cd ../server
npm run dev &
BACKEND_PID=$!

echo "⏳ 等待后端服务器启动..."
sleep 5

echo "🎨 启动前端服务器 (端口 5173)..."
cd ../client
npm run dev &
FRONTEND_PID=$!

echo "⏳ 等待前端服务器启动..."
sleep 5

echo ""
echo "🎉 系统启动成功！(局域网可见)"
echo "=================================================="
echo "📍 本机访问:"
echo "   📊 后端服务器: http://localhost:3001"
echo "   🖥️  前端应用: http://localhost:5173"
echo ""
echo "🌐 局域网访问:"
echo "   📊 后端服务器: http://${LOCAL_IP}:3001"
echo "   🖥️  前端应用: http://${LOCAL_IP}:5173"
echo ""
echo "📱 移动设备访问:"
echo "   在同一WiFi网络下，用手机浏览器访问: http://${LOCAL_IP}:5173"
echo ""
echo "🔐 默认管理员账户:"
echo "   邮箱: admin@crm.com"
echo "   密码: admin123"
echo ""
echo "🔥 局域网访问说明:"
echo "   ✓ 确保所有设备连接到同一个WiFi/局域网"
echo "   ✓ 检查防火墙设置，确保端口3001和5173未被阻止"
echo "   ✓ 如果无法访问，请检查路由器设置"
echo ""
echo "🛑 按 Ctrl+C 停止所有服务"

# Wait for user interruption
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✅ 所有服务已停止'; exit 0" INT

# Keep script running
wait 