#!/bin/bash

# Amazon FBM CRM VPS 部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 开始部署 Amazon FBM CRM 到 VPS..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印彩色消息
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    print_status "检查 Docker 安装状态..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    print_success "Docker 环境检查通过"
}

# 创建必要的目录
create_directories() {
    print_status "创建必要的目录..."
    mkdir -p data uploads ssl logs
    
    # 设置权限
    chmod 755 data uploads
    
    print_success "目录创建完成"
}

# 生成随机 JWT Secret
generate_jwt_secret() {
    if [ ! -f .env ]; then
        print_status "生成 JWT Secret..."
        JWT_SECRET=$(openssl rand -hex 32)
        
        # 创建 .env 文件
        cat > .env << EOF
# 生产环境配置
NODE_ENV=production
PORT=3001

# JWT密钥
JWT_SECRET=${JWT_SECRET}

# 数据库配置
DATABASE_URL=/app/data/database.sqlite

# 文件上传配置
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=100MB

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379

# 日志级别
LOG_LEVEL=info

# 跨域配置
CORS_ORIGIN=*

# 应用配置
APP_NAME=Amazon FBM CRM
APP_VERSION=1.0.0
EOF
        
        print_success "环境配置文件创建完成"
    else
        print_warning ".env 文件已存在，跳过创建"
    fi
}

# 构建镜像
build_image() {
    print_status "构建 Docker 镜像..."
    docker-compose build --no-cache
    print_success "镜像构建完成"
}

# 停止旧服务
stop_services() {
    print_status "停止现有服务..."
    docker-compose down
    print_success "服务停止完成"
}

# 启动服务
start_services() {
    print_status "启动服务..."
    docker-compose up -d
    print_success "服务启动完成"
}

# 检查服务状态
check_services() {
    print_status "检查服务状态..."
    sleep 10
    
    # 检查容器状态
    if docker-compose ps | grep -q "Up"; then
        print_success "服务运行正常"
        
        # 显示服务信息
        echo ""
        echo "📊 服务状态:"
        docker-compose ps
        
        echo ""
        echo "🌐 访问信息:"
        echo "  应用地址: http://your-server-ip"
        echo "  默认登录: admin@crm.com / admin123"
        
    else
        print_error "服务启动失败，请检查日志"
        echo "查看日志命令: docker-compose logs"
        exit 1
    fi
}

# 显示日志
show_logs() {
    echo ""
    read -p "是否查看服务日志？(y/n): " show_log
    if [ "$show_log" = "y" ] || [ "$show_log" = "Y" ]; then
        print_status "显示服务日志 (按 Ctrl+C 退出)..."
        docker-compose logs -f
    fi
}

# 主部署流程
main() {
    echo ""
    echo "=========================================="
    echo "🏪 Amazon FBM CRM VPS 部署脚本"
    echo "=========================================="
    echo ""
    
    check_docker
    create_directories
    generate_jwt_secret
    stop_services
    build_image
    start_services
    check_services
    
    echo ""
    print_success "🎉 部署完成！"
    echo ""
    echo "📋 常用命令:"
    echo "  查看日志: docker-compose logs -f"
    echo "  重启服务: docker-compose restart"
    echo "  停止服务: docker-compose down"
    echo "  更新应用: ./deploy.sh"
    echo ""
    
    show_logs
}

# 运行主流程
main "$@" 