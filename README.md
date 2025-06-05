# 亚马逊FBM订单管理系统 (Amazon FBM Order CRM)

## 📋 系统概述

一个专为亚马逊FBM业务设计的订单管理CRM系统，采用现代化的Apple风格界面设计，提供完整的订单管理、用户权限控制和数据导出功能。

## ✨ 核心功能

### 🔐 用户权限管理
- **管理员 (Admin)**: 完整系统权限，可管理用户、字段和订单
- **运营 (Operator)**: 订单管理权限
- **跟单 (Tracker)**: 订单跟踪权限  
- **美工 (Designer)**: 订单查看和编辑权限

### 📊 订单管理
- 创建、编辑、删除订单
- 30种专业订单字段配置
- 智能搜索和筛选
- 批量导出Excel/CSV

### 👥 用户管理 (新功能)
- **仅管理员功能**: 创建、编辑、删除用户
- **角色分配**: 为用户分配不同权限角色
- **密码管理**: 重置用户密码
- **安全保护**: 防止删除自己的账户
- **移除注册**: 删除公开注册功能，确保安全

### ⚙️ 字段配置
- 自定义字段类型：文本、货币、日期、选择、多选、富文本、文件
- 字段排序和必填设置
- 动态表单生成

### 🎨 界面设计
- Apple风格iOS/macOS设计语言
- 玻璃态效果和渐变背景
- 响应式布局和流畅动画
- SF Pro Display字体和优雅排版

## 🚀 快速开始

### 系统要求
- Node.js 16+ 
- npm 或 yarn

### 一键启动
```bash
chmod +x start.sh
./start.sh
```

### 手动启动
```bash
# 后端服务器
cd server
npm install
npm run dev

# 前端服务器 (新终端)
cd client  
npm install
npm run dev
```

### 访问系统
- **前端应用**: http://localhost:5173
- **后端API**: http://localhost:3001
- **默认管理员账户**: admin@crm.com / admin123

## 📁 项目结构

```
├── server/                 # 后端服务器
│   ├── routes/            # API路由
│   │   ├── auth.ts        # 用户认证 (已移除注册)
│   │   ├── orders.ts      # 订单管理
│   │   ├── fields.ts      # 字段配置
│   │   └── users.ts       # 用户管理 (新增)
│   ├── middleware/        # 中间件
│   ├── database.ts        # 数据库配置
│   └── index.ts          # 服务器入口
│
├── client/                # 前端应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   │   ├── Login.tsx           # 登录页 (已移除注册链接)
│   │   │   ├── Dashboard.tsx       # 仪表板
│   │   │   ├── Orders.tsx          # 订单管理
│   │   │   ├── FieldManagement.tsx # 字段管理
│   │   │   └── UserManagement.tsx  # 用户管理 (新增)
│   │   ├── components/    # 通用组件
│   │   ├── contexts/      # React上下文
│   │   └── utils/         # 工具函数
│   └── public/           # 静态资源
│
├── database.db           # SQLite数据库
├── start.sh              # 启动脚本
└── README.md             # 项目文档
```

## 🔄 最新更新

### v2.0 - 用户管理系统
**🗓️ 更新时间**: 2024年

**✨ 新增功能**:
- **用户管理界面**: 管理员专用的用户管理页面
- **用户CRUD操作**: 创建、编辑、删除用户功能
- **密码重置**: 管理员可为任何用户重置密码
- **角色权限控制**: 更严格的权限验证
- **移除注册功能**: 提升系统安全性

**🔧 技术改进**:
- 新增 `/api/users` API端点
- 增强的权限中间件
- 优化的TypeScript类型定义
- 改进的错误处理机制

**🚫 移除功能**:
- 用户注册页面和API
- 注册相关的前端路由
- 登录页面的注册链接

## 🛡️ 安全特性

### 用户管理安全
- 仅管理员可访问用户管理功能
- 防止管理员删除自己的账户
- 密码最小长度验证 (6位)
- 用户名和邮箱唯一性验证

### 系统安全
- JWT令牌认证
- 密码bcrypt加密
- API请求限制
- 输入数据验证

## 🎯 系统角色权限

| 功能 | 管理员 | 运营 | 跟单 | 美工 |
|------|--------|------|------|------|
| 订单管理 | ✅ | ✅ | ✅ | ✅ |
| 订单删除 | ✅ | ❌ | ❌ | ❌ |
| 字段配置 | ✅ | ❌ | ❌ | ❌ |
| 用户管理 | ✅ | ❌ | ❌ | ❌ |
| 数据导出 | ✅ | ✅ | ✅ | ✅ |

## 📊 数据库结构

### users 表
```sql
- id: 主键
- username: 用户名 (唯一)
- email: 邮箱 (唯一) 
- password: 加密密码
- role: 用户角色
- created_at: 创建时间
- updated_at: 更新时间
```

### orders 表
```sql
- id: 主键
- order_data: JSON格式订单数据
- created_by: 创建用户ID
- created_at: 创建时间
- updated_at: 更新时间
```

### field_definitions 表
```sql
- id: 主键
- field_name: 字段名称
- field_label: 字段标签
- field_type: 字段类型
- required: 是否必填
- options: 选择项 (JSON)
- sort_order: 排序
```

## 🚀 部署说明

### 生产环境部署
1. 设置环境变量
2. 构建前端应用: `npm run build`
3. 启动生产服务器
4. 配置反向代理 (Nginx)
5. 设置SSL证书

### 环境变量
```env
NODE_ENV=production
JWT_SECRET=your-secret-key
DB_PATH=./database.db
UPLOAD_PATH=./uploads
```

## 🌐 在线演示

### Vercel部署状态
- **状态**: 🚀 已配置，准备部署
- **最新更新**: 2024年12月
- **功能**: 演示版本使用模拟数据

## 🤝 技术支持

如有问题或建议，请联系系统管理员。

---

**© 2025 亚马逊FBM订单管理系统. 保留所有权利.** 