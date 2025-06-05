# 🚀 Amazon FBM CRM VPS 部署指南

本指南将帮助您在自己的VPS服务器上部署Amazon FBM CRM系统。

## 📋 系统要求

### 服务器配置
- **CPU**: 2核心或以上
- **内存**: 2GB RAM 或以上（推荐4GB）
- **存储**: 20GB 可用空间或以上
- **网络**: 公网IP地址
- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+

### 软件依赖
- Docker 20.0+
- Docker Compose 1.29+
- Git
- OpenSSL

## 🛠 环境准备

### 1. 更新系统
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. 安装 Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 3. 安装 Docker Compose
```bash
# 下载最新版本
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### 4. 安装其他依赖
```bash
# Ubuntu/Debian
sudo apt install -y git openssl

# CentOS/RHEL
sudo yum install -y git openssl
```

## 📥 部署步骤

### 1. 克隆项目
```bash
# 克隆项目到服务器
git clone https://github.com/harkinhan/amazon-fbm-crm-web.git
cd amazon-fbm-crm-web
```

### 2. 配置权限
```bash
# 给部署脚本添加执行权限
chmod +x deploy.sh
```

### 3. 执行部署
```bash
# 运行自动化部署脚本
./deploy.sh
```

部署脚本会自动：
- ✅ 检查Docker环境
- ✅ 创建必要目录
- ✅ 生成JWT密钥
- ✅ 构建Docker镜像
- ✅ 启动所有服务
- ✅ 检查服务状态

### 4. 访问应用
部署完成后，您可以通过以下方式访问：
- **网址**: `http://your-server-ip`
- **默认账号**: `admin@crm.com`
- **默认密码**: `admin123`

## 🔧 配置说明

### 环境变量配置
部署后会自动生成 `.env` 文件，包含以下关键配置：

```bash
# JWT密钥（自动生成）
JWT_SECRET=随机生成的密钥

# 数据库路径
DATABASE_URL=/app/data/database.sqlite

# 文件上传目录
UPLOAD_DIR=/app/uploads

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
```

### 端口配置
- **HTTP**: 80端口（Nginx反向代理）
- **HTTPS**: 443端口（需要SSL证书）
- **应用服务**: 3001端口（内部）
- **Redis**: 6379端口（内部）

## 🔒 SSL证书配置（可选）

### 1. 获取证书
```bash
# 使用 Let's Encrypt 免费证书
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

### 2. 配置证书
```bash
# 将证书复制到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
sudo chown $USER:$USER ./ssl/*.pem
```

### 3. 启用HTTPS
编辑 `nginx.conf` 文件，取消HTTPS配置的注释并修改域名。

## 📊 管理命令

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f app
docker-compose logs -f nginx
docker-compose logs -f redis
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart app
```

### 停止服务
```bash
docker-compose down
```

### 更新应用
```bash
# 拉取最新代码
git pull origin main

# 重新部署
./deploy.sh
```

## 📁 目录结构

```
amazon-fbm-crm-web/
├── client/                 # 前端源码
├── server/                 # 后端源码
├── data/                   # 数据库文件（自动创建）
├── uploads/                # 文件上传目录（自动创建）
├── ssl/                    # SSL证书目录（自动创建）
├── logs/                   # 日志目录（自动创建）
├── Dockerfile              # Docker镜像配置
├── docker-compose.yml      # 服务编排配置
├── nginx.conf              # Nginx配置
├── deploy.sh               # 部署脚本
└── .env                    # 环境变量（自动生成）
```

## 🔍 故障排除

### 1. 端口被占用
```bash
# 检查端口使用情况
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 停止占用端口的服务
sudo systemctl stop apache2  # 如果安装了Apache
sudo systemctl stop nginx    # 如果安装了系统Nginx
```

### 2. 权限问题
```bash
# 修复文件权限
sudo chown -R $USER:$USER ./data ./uploads
chmod 755 ./data ./uploads
```

### 3. 内存不足
```bash
# 创建交换文件（如果内存小于2GB）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

### 4. 数据库问题
```bash
# 重置数据库（注意：会清除所有数据）
rm -f ./data/database.sqlite
docker-compose restart app
```

## 🔄 备份与恢复

### 数据备份
```bash
# 创建备份目录
mkdir -p backups

# 备份数据库
cp ./data/database.sqlite ./backups/database_$(date +%Y%m%d_%H%M%S).sqlite

# 备份上传文件
tar -czf ./backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz ./uploads/
```

### 数据恢复
```bash
# 停止服务
docker-compose down

# 恢复数据库
cp ./backups/database_YYYYMMDD_HHMMSS.sqlite ./data/database.sqlite

# 恢复上传文件
tar -xzf ./backups/uploads_YYYYMMDD_HHMMSS.tar.gz

# 启动服务
docker-compose up -d
```

## 🛡 安全建议

1. **修改默认密码**: 首次登录后立即修改管理员密码
2. **防火墙配置**: 只开放必要端口（80, 443, 22）
3. **定期更新**: 定期更新系统和应用
4. **SSL证书**: 生产环境建议使用HTTPS
5. **数据备份**: 定期备份重要数据
6. **监控日志**: 定期检查应用和系统日志

## 🆘 技术支持

如果在部署过程中遇到问题，可以：

1. **查看日志**: `docker-compose logs -f`
2. **检查服务状态**: `docker-compose ps`
3. **重新部署**: `./deploy.sh`
4. **清理重建**: `docker-compose down && docker system prune -f && ./deploy.sh`

## 📝 更新日志

- **v1.0.0**: 初始版本，支持基础CRM功能
- **v1.0.1**: 修复Vite构建问题，添加terser依赖
- **v1.0.2**: 完善VPS部署配置

---

🎉 **恭喜！** 您的Amazon FBM CRM系统已成功部署！ 