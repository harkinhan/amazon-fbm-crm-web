import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { config } from './config';
import { initDatabase } from './database';

// Import routes
import authRoutes from './routes/auth';
import orderRoutes from './routes/orders';
import fieldRoutes from './routes/fields';
import userRoutes from './routes/users';

const app = express();

// Trust proxy for nginx reverse proxy
app.set('trust proxy', 1);

// Create uploads directory if it doesn't exist
if (!fs.existsSync(config.uploadPath)) {
  fs.mkdirSync(config.uploadPath, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10000 requests per 15 minutes
  skip: (req) => config.nodeEnv === 'development' // skip rate limiting in development
});
app.use(limiter);

// Static files for uploads
app.use('/uploads', express.static(config.uploadPath));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/users', userRoutes);

// Serve React app in production
if (config.nodeEnv === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// For Vercel deployment
export default app;

// Initialize database and start server (only in non-serverless environments)
if (process.env.VERCEL !== '1') {
  initDatabase()
    .then(() => {
      console.log('数据库初始化成功');
      
      const port = Number(config.port);
      app.listen(port, '0.0.0.0', () => {
        console.log(`服务器运行在端口 ${port}`);
        console.log(`本地访问: http://localhost:${port}`);
        console.log(`局域网访问: http://你的IP地址:${port}`);
        console.log(`管理员账户: admin@crm.com / admin123`);
      });
    })
    .catch((error) => {
      console.error('数据库初始化失败:', error);
      process.exit(1);
    });
} 