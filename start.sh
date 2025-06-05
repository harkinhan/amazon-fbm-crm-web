#!/bin/bash

# Amazon FBM CRM System Startup Script
# 亚马逊FBM订单管理系统启动脚本

echo "🚀 启动亚马逊FBM订单管理系统..."
echo "======================================"

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
echo "🎉 系统启动成功！"
echo "======================================"
echo "📊 后端服务器: http://localhost:3001"
echo "🖥️  前端应用: http://localhost:5173"
echo ""
echo "🔐 默认管理员账户:"
echo "   邮箱: admin@crm.com"
echo "   密码: admin123"
echo ""
echo "✨ 新功能说明:"
echo "   ✓ 删除了用户注册功能"
echo "   ✓ 新增用户管理功能（仅管理员）"
echo "   ✓ 管理员可以创建用户并分配角色"
echo "   ✓ 支持密码重置功能"
echo "   ✓ 防止删除自己的账户"
echo ""
echo "📝 系统功能:"
echo "   • 订单管理 (CRUD操作)"
echo "   • 30种专业订单字段"
echo "   • 导出Excel/CSV功能"
echo "   • 用户权限管理"
echo "   • 字段配置管理"
echo "   • Apple风格界面设计"
echo ""
echo "🛑 按 Ctrl+C 停止所有服务"

# Wait for user interruption
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✅ 所有服务已停止'; exit 0" INT

# Keep script running
wait