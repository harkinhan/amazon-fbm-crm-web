# 📚 GitHub上传完整指南

## 🎯 准备工作

### 1. 确认GitHub账户
- 如果没有GitHub账户，请访问 [github.com](https://github.com) 注册
- 记住您的用户名，后面会用到

### 2. 在GitHub创建新仓库
1. 登录GitHub后，点击右上角的 **"+"** 按钮
2. 选择 **"New repository"**
3. 填写仓库信息：
   - **Repository name**: `amazon-fbm-crm` (或您喜欢的名字)
   - **Description**: `亚马逊FBM订单管理系统 - Amazon FBM Order CRM System`
   - **Public/Private**: 根据需求选择
   - **⚠️ 重要**: 不要勾选 "Add a README file"、"Add .gitignore"、"Choose a license"
4. 点击 **"Create repository"**

## 🔧 本地配置Git

### 3. 配置Git用户信息（首次使用Git必需）
```bash
# 设置用户名（替换为您的GitHub用户名）
git config --global user.name "harkinhan"

# 设置邮箱（替换为您的GitHub邮箱）
git config --global user.email "harkinhan@gmail.com"
```

### 4. 添加所有文件到Git
```bash
# 添加所有文件
git add .

# 查看状态
git status
```

### 5. 提交代码
```bash
# 提交代码（第一次提交）
git commit -m "初始提交：亚马逊FBM订单管理系统"
```

## 🚀 连接并上传到GitHub

### 6. 连接到GitHub仓库
```bash
# 添加远程仓库（替换为您的GitHub用户名和仓库名）
git remote add origin https://github.com/您的用户名/amazon-fbm-crm.git

# 设置默认分支
git branch -M main
```

### 7. 推送代码到GitHub
```bash
# 第一次推送
git push -u origin main
```

**如果遇到身份验证问题，GitHub会提示您创建Personal Access Token**

## 🔐 创建GitHub Token（如果需要）

### 8. 创建Personal Access Token
1. 去GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 点击 "Generate new token (classic)"
3. 设置过期时间和权限（至少选择 `repo` 权限）
4. 生成后复制Token（⚠️ 只会显示一次）

### 9. 使用Token推送
```bash
# 当提示输入密码时，输入Token而不是密码
git push -u origin main
```

## ✅ 验证上传成功

### 10. 检查GitHub仓库
- 刷新您的GitHub仓库页面
- 应该能看到所有项目文件
- README.md会自动显示项目介绍

## 📝 后续更新代码

### 日常更新流程
```bash
# 1. 添加更改的文件
git add .

# 2. 提交更改（写清楚改了什么）
git commit -m "描述您的更改"

# 3. 推送到GitHub
git push
```

## 🆘 常见问题解决

### 问题1：推送被拒绝
```bash
# 解决方案：先拉取远程更改
git pull origin main --allow-unrelated-histories
git push
```

### 问题2：忘记添加文件
```bash
# 添加遗漏的文件
git add 文件名
git commit -m "添加遗漏的文件"
git push
```

### 问题3：想要删除敏感信息
```bash
# 删除文件并提交
git rm 文件名
git commit -m "删除敏感文件"
git push
```

## 🎉 完成！

上传成功后，您的项目将在这个地址可见：
`https://github.com/您的用户名/仓库名`

---

**💡 提示**: 
- 第一次可能需要15-30分钟完成所有步骤
- 有问题随时询问
- 记得定期备份重要代码到GitHub 