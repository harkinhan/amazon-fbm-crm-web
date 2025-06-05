# 多阶段构建 Dockerfile
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制根目录的package.json
COPY package*.json ./
RUN npm ci --only=production

# 构建前端
COPY client/ ./client/
WORKDIR /app/client
RUN npm ci --only=production
RUN npm run build

# 构建后端
WORKDIR /app
COPY server/ ./server/
COPY tsconfig.json ./
RUN npm run server:build

# 生产阶段
FROM node:18-alpine AS production

# 创建应用用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 复制构建后的文件
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/client/dist ./client/dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# 创建必要的目录
RUN mkdir -p /app/uploads /app/data
RUN chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["npm", "start"] 