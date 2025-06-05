// Vercel Serverless Function Entry Point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mock database for demo (Vercel doesn't support SQLite files)
let mockOrders = [
  {
    id: 1,
    order_data: JSON.stringify({
      orderNumber: 'DEMO001',
      customerName: '演示客户',
      productName: '演示产品',
      quantity: 1,
      price: 99.99,
      status: '已处理',
      orderDate: new Date().toISOString().split('T')[0]
    }),
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@crm.com',
    role: 'admin',
    created_at: new Date().toISOString()
  }
];

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@crm.com' && password === 'admin123') {
    const user = mockUsers[0];
    const token = 'demo-jwt-token-' + Date.now();
    
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } else {
    res.status(401).json({ error: '邮箱或密码错误' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = mockUsers[0];
  res.json({ user });
});

// Orders routes
app.get('/api/orders', (req, res) => {
  res.json(mockOrders);
});

app.get('/api/orders/stats', (req, res) => {
  res.json({
    totalOrders: mockOrders.length,
    todayOrders: 1,
    unshippedOrders: 0,
    exceptionOrders: 0,
    weekOrders: 1,
    monthOrders: 1,
    yesterdayOrders: 0,
    totalRevenue: 99.99,
    monthRevenue: 99.99,
    avgOrderValue: 99.99,
    statusDistribution: { '已处理': 1 },
    shopDistribution: { '演示店铺': 1 },
    productDistribution: { '演示产品': 1 }
  });
});

app.post('/api/orders', (req, res) => {
  const newOrder = {
    id: mockOrders.length + 1,
    order_data: JSON.stringify(req.body),
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  mockOrders.push(newOrder);
  res.json({ message: '订单创建成功', order: newOrder });
});

app.put('/api/orders/:id', (req, res) => {
  const orderId = parseInt(req.params.id);
  const orderIndex = mockOrders.findIndex(order => order.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  mockOrders[orderIndex] = {
    ...mockOrders[orderIndex],
    order_data: JSON.stringify(req.body),
    updated_at: new Date().toISOString()
  };
  
  res.json({ message: '订单更新成功', order: mockOrders[orderIndex] });
});

app.delete('/api/orders/:id', (req, res) => {
  const orderId = parseInt(req.params.id);
  const orderIndex = mockOrders.findIndex(order => order.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  mockOrders.splice(orderIndex, 1);
  res.json({ message: '订单删除成功' });
});

// Fields routes
app.get('/api/fields', (req, res) => {
  res.json([
    {
      id: 1,
      field_name: 'orderNumber',
      field_label: '订单号',
      field_type: 'text',
      required: true,
      sort_order: 1
    },
    {
      id: 2,
      field_name: 'customerName',
      field_label: '客户姓名',
      field_type: 'text',
      required: true,
      sort_order: 2
    },
    {
      id: 3,
      field_name: 'productName',
      field_label: '产品名称',
      field_type: 'text',
      required: true,
      sort_order: 3
    },
    {
      id: 4,
      field_name: 'quantity',
      field_label: '数量',
      field_type: 'number',
      required: true,
      sort_order: 4
    },
    {
      id: 5,
      field_name: 'price',
      field_label: '价格',
      field_type: 'currency',
      required: true,
      sort_order: 5
    },
    {
      id: 6,
      field_name: 'status',
      field_label: '订单状态',
      field_type: 'select',
      required: true,
      options: JSON.stringify(['待处理', '已处理', '已发货', '已签收', '异常件', '已取消']),
      sort_order: 6
    },
    {
      id: 7,
      field_name: 'orderDate',
      field_label: '订单日期',
      field_type: 'date',
      required: true,
      sort_order: 7
    }
  ]);
});

// Users routes
app.get('/api/users', (req, res) => {
  res.json(mockUsers);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    platform: 'Vercel Demo',
    note: 'This is a demo version with mock data'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

module.exports = app; 