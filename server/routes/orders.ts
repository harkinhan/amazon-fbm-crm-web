import { Router } from 'express';
import * as XLSX from 'xlsx';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../database';
import { authenticateToken } from '../middleware/auth';
import { safeWriteExcel, sanitizeObject } from '../utils/excelSecurity';

const router = Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/orders';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳_原文件名
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const uniqueName = `${timestamp}_${name}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.cdr', '.ai', '.eps', '.doc', '.docx', '.xlsx', '.xls', '.ppt', '.pptx', '.txt', '.zip', '.rar'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 文件上传端点
router.post('/:id/upload/:fieldName', authenticateToken, upload.single('file'), async (req, res) => {
  const orderId = req.params.id;
  const fieldName = req.params.fieldName;
  const userId = req.user?.userId;
  
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  try {
    // 检查订单是否存在
    const order: any = await new Promise((resolve, reject) => {
      db.get(
        'SELECT order_data FROM orders WHERE id = ?',
        [orderId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 更新订单数据 - 支持多文件
    const orderData = JSON.parse(order.order_data);
    
    // 获取当前字段的文件列表，如果不存在则初始化为空数组
    let currentFiles = orderData[fieldName];
    if (!Array.isArray(currentFiles)) {
      // 如果当前是单个文件名（旧格式），转换为数组
      currentFiles = currentFiles ? [currentFiles] : [];
    }
    
    // 检查文件数量限制（最多5个）
    if (currentFiles.length >= 5) {
      // 删除刚上传的文件
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: '每个字段最多只能上传5个文件' });
    }
    
    // 添加新文件到列表
    currentFiles.push(req.file.filename);
    orderData[fieldName] = currentFiles;
    
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE orders SET order_data = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(orderData), userId, orderId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    res.json({ 
      message: '文件上传成功',
      filename: req.file.filename,
      totalFiles: currentFiles.length
    });
    
  } catch (error) {
    console.error('文件上传失败:', error);
    // 如果数据库操作失败，删除已上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: '文件上传失败' });
  }
});

// Get all shops for order form (all users) - 必须在 /:id 路由之前定义
router.get('/shops', authenticateToken, (req, res) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  // 管理员可以看到所有店铺
  if (userRole === 'admin') {
    // 只从现有订单中获取店铺名称，不使用预定义列表
    db.all(
      `SELECT DISTINCT JSON_EXTRACT(order_data, '$.shop_name') as shop_name 
       FROM orders 
       WHERE JSON_EXTRACT(order_data, '$.shop_name') IS NOT NULL 
       AND JSON_EXTRACT(order_data, '$.shop_name') != ''
       ORDER BY shop_name ASC`,
      (err, rows: any[]) => {
        if (err) {
          console.error('获取现有订单店铺失败:', err);
          return res.status(500).json({ error: '获取店铺列表失败' });
        }
        
        // 提取店铺名称并过滤空值
        const shops = rows
          .map(row => row.shop_name)
          .filter(shop => shop && shop.trim() !== '')
          .sort(); // 按字母顺序排序
        
        res.json(shops);
      }
    );
  } else {
    // 非管理员用户只能看到有权限的店铺
    db.all(
      'SELECT shop_name FROM user_shop_permissions WHERE user_id = ?',
      [userId],
      (err, permissions: any[]) => {
        if (err) {
          console.error('获取用户权限失败:', err);
          return res.status(500).json({ error: '获取用户权限失败' });
        }

        const userShops = permissions.map(p => p.shop_name);
        
        // 如果用户没有任何店铺权限，返回空数组
        if (userShops.length === 0) {
          return res.json([]);
        }

        // 返回用户有权限的店铺列表，按字母顺序排序
        res.json(userShops.sort());
      }
    );
  }
});

// Helper function to regenerate all order IDs based on row numbers
const regenerateOrderIds = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Get all orders ordered by creation time
    db.all(
      'SELECT id, order_data FROM orders ORDER BY created_at ASC',
      (err, rows: any[]) => {
        if (err) {
          return reject(err);
        }

        if (rows.length === 0) {
          return resolve();
        }

        let completed = 0;
        const total = rows.length;

        rows.forEach((row, index) => {
          const orderData = JSON.parse(row.order_data);
          const rowNumber = index + 1; // Row number starts from 1
          
          // Only regenerate if order has both order_type and shop_name
          if (orderData.order_type && orderData.shop_name) {
            const newOrderId = `AM${orderData.order_type}-${orderData.shop_name}-${rowNumber}`;
            
            const updatedOrderData = {
              ...orderData,
              order_id: newOrderId
            };

            db.run(
              'UPDATE orders SET order_data = ? WHERE id = ?',
              [JSON.stringify(updatedOrderData), row.id],
              (updateErr) => {
                completed++;
                if (updateErr) {
                  console.error(`Failed to update order ${row.id}:`, updateErr);
                }
                
                if (completed === total) {
                  resolve();
                }
              }
            );
          } else {
            completed++;
            if (completed === total) {
              resolve();
            }
          }
        });
      }
    );
  });
};

// Get all orders
router.get('/', authenticateToken, (req, res) => {
  db.all(
    `SELECT o.*, 
            u1.username as created_by_username,
            u2.username as updated_by_username
     FROM orders o
     LEFT JOIN users u1 ON o.created_by = u1.id
     LEFT JOIN users u2 ON o.updated_by = u2.id
     ORDER BY o.created_at ASC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: '获取订单失败' });
      }

      const orders = rows.map((row: any) => ({
        ...row,
        order_data: JSON.parse(row.order_data)
      }));

      res.json(orders);
    }
  );
});

// Get filtered orders for dashboard based on user permissions
router.get('/dashboard', authenticateToken, (req, res) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  // 管理员可以查看所有订单
  if (userRole === 'admin') {
    db.all(
      `SELECT o.*, 
              u1.username as created_by_username,
              u2.username as updated_by_username
       FROM orders o
       LEFT JOIN users u1 ON o.created_by = u1.id
       LEFT JOIN users u2 ON o.updated_by = u2.id
       ORDER BY o.created_at ASC`,
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: '获取订单失败' });
        }

        const orders = rows.map((row: any) => ({
          ...row,
          order_data: JSON.parse(row.order_data)
        }));

        res.json(orders);
      }
    );
  } else {
    // 非管理员用户只能查看有权限的店铺的订单
    db.all(
      'SELECT shop_name FROM user_shop_permissions WHERE user_id = ?',
      [userId],
      (err, permissions: any[]) => {
        if (err) {
          return res.status(500).json({ error: '获取用户权限失败' });
        }

        const userShops = permissions.map(p => p.shop_name);
        
        // 如果用户没有任何店铺权限，返回空数组
        if (userShops.length === 0) {
          return res.json([]);
        }

        // 构建IN查询的占位符
        const placeholders = userShops.map(() => '?').join(',');
        
        db.all(
          `SELECT o.*, 
                  u1.username as created_by_username,
                  u2.username as updated_by_username
           FROM orders o
           LEFT JOIN users u1 ON o.created_by = u1.id
           LEFT JOIN users u2 ON o.updated_by = u2.id
           WHERE JSON_EXTRACT(o.order_data, '$.shop_name') IN (${placeholders})
           ORDER BY o.created_at ASC`,
          userShops,
          (err, rows) => {
            if (err) {
              return res.status(500).json({ error: '获取订单失败' });
            }

            const orders = rows.map((row: any) => ({
              ...row,
              order_data: JSON.parse(row.order_data)
            }));

            res.json(orders);
          }
        );
      }
    );
  }
});

// Get statistics for dashboard
router.get('/stats', authenticateToken, (req, res) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  // 根据用户权限决定查询范围
  const getUserPermissions = (): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      if (userRole === 'admin') {
        resolve(['admin']); // 标记为管理员
      } else {
        db.all(
          'SELECT shop_name FROM user_shop_permissions WHERE user_id = ?',
          [userId],
          (err, permissions: any[]) => {
            if (err) reject(err);
            else resolve(permissions.map(p => p.shop_name));
          }
        );
      }
    });
  };

  getUserPermissions()
    .then(userShops => {
      // 构建查询条件
      let whereClause = '';
      let queryParams: any[] = [];

      if (userRole !== 'admin' && userShops.length > 0) {
        const placeholders = userShops.map(() => '?').join(',');
        whereClause = `WHERE JSON_EXTRACT(order_data, '$.shop_name') IN (${placeholders})`;
        queryParams = userShops;
      } else if (userRole !== 'admin' && userShops.length === 0) {
        // 无权限用户返回空统计
        return res.json({
          totalOrders: 0,
          todayOrders: 0,
          unshippedOrders: 0,
          exceptionOrders: 0,
          weekOrders: 0,
          monthOrders: 0,
          yesterdayOrders: 0,
          totalRevenue: 0,
          monthRevenue: 0,
          avgOrderValue: 0,
          statusDistribution: {},
          shopDistribution: {},
          deliveryTypeDistribution: {},
          avgProcessingDays: 0,
          pendingDays: 0
        });
      }

      // 执行多个统计查询
      const queries = {
        // 基础计数统计
        totalOrders: `SELECT COUNT(*) as count FROM orders ${whereClause}`,
        todayOrders: `SELECT COUNT(*) as count FROM orders ${whereClause} ${whereClause ? 'AND' : 'WHERE'} date(created_at) = date('now')`,
        yesterdayOrders: `SELECT COUNT(*) as count FROM orders ${whereClause} ${whereClause ? 'AND' : 'WHERE'} date(created_at) = date('now', '-1 day')`,
        weekOrders: `SELECT COUNT(*) as count FROM orders ${whereClause} ${whereClause ? 'AND' : 'WHERE'} date(created_at) >= date('now', '-7 days')`,
        monthOrders: `SELECT COUNT(*) as count FROM orders ${whereClause} ${whereClause ? 'AND' : 'WHERE'} date(created_at) >= date('now', 'start of month')`,
        
        // 状态统计
        unshippedOrders: `SELECT COUNT(*) as count FROM orders ${whereClause} ${whereClause ? 'AND' : 'WHERE'} (JSON_EXTRACT(order_data, '$.order_status') IS NULL OR JSON_EXTRACT(order_data, '$.order_status') = '' OR JSON_EXTRACT(order_data, '$.order_status') = '--' OR JSON_EXTRACT(order_data, '$.order_status') = '已处理')`,
        exceptionOrders: `SELECT COUNT(*) as count FROM orders ${whereClause} ${whereClause ? 'AND' : 'WHERE'} JSON_EXTRACT(order_data, '$.order_status') = '异常件'`,
      };

      // 执行所有基础查询
      const executeQuery = (query: string, params: any[] = []): Promise<number> => {
        return new Promise((resolve, reject) => {
          db.get(query, params, (err, row: any) => {
            if (err) reject(err);
            else resolve(row?.count || 0);
          });
        });
      };

      Promise.all([
        executeQuery(queries.totalOrders, queryParams),
        executeQuery(queries.todayOrders, queryParams),
        executeQuery(queries.yesterdayOrders, queryParams),
        executeQuery(queries.weekOrders, queryParams),
        executeQuery(queries.monthOrders, queryParams),
        executeQuery(queries.unshippedOrders, queryParams),
        executeQuery(queries.exceptionOrders, queryParams),
      ])
      .then(([totalOrders, todayOrders, yesterdayOrders, weekOrders, monthOrders, unshippedOrders, exceptionOrders]) => {
        // 获取分布数据和金额统计
        const distributionQueries = [
          // 状态分布
          new Promise((resolve, reject) => {
            db.all(
              `SELECT 
                COALESCE(JSON_EXTRACT(order_data, '$.order_status'), '--') as status, 
                COUNT(*) as count 
               FROM orders ${whereClause} 
               GROUP BY JSON_EXTRACT(order_data, '$.order_status')`,
              queryParams,
              (err, rows: any[]) => {
                if (err) reject(err);
                else {
                  const distribution: { [key: string]: number } = {};
                  rows.forEach(row => {
                    distribution[row.status || '--'] = row.count;
                  });
                  resolve(distribution);
                }
              }
            );
          }),
          
          // 店铺分布
          new Promise((resolve, reject) => {
            db.all(
              `SELECT 
                COALESCE(JSON_EXTRACT(order_data, '$.shop_name'), '未知店铺') as shop, 
                COUNT(*) as count 
               FROM orders ${whereClause} 
               GROUP BY JSON_EXTRACT(order_data, '$.shop_name')`,
              queryParams,
              (err, rows: any[]) => {
                if (err) reject(err);
                else {
                  const distribution: { [key: string]: number } = {};
                  rows.forEach(row => {
                    distribution[row.shop || '未知店铺'] = row.count;
                  });
                  resolve(distribution);
                }
              }
            );
          }),
          
          // 产品名称分布（带详细调试）
          new Promise((resolve, reject) => {
            // 先获取所有字段定义，找到产品名称相关的字段
            db.all('SELECT field_name, field_label FROM field_definitions', (fieldErr, fieldRows: any[]) => {
              if (fieldErr) {
                console.error('获取字段定义失败:', fieldErr);
                return reject(fieldErr);
              }

              // 查找产品相关字段（优先级：产品名称 > 商品名称 > 产品）
              const productFields = fieldRows.filter(field => {
                const label = field.field_label.toLowerCase();
                const name = field.field_name.toLowerCase();
                
                // 产品相关但排除成本相关
                const isProductRelated = (
                  label.includes('产品') ||
                  label.includes('商品') ||
                  name.includes('product')
                );
                
                const isCostRelated = (
                  label.includes('成本') ||
                  label.includes('cost') ||
                  label.includes('price')
                );
                
                const isPersonRelated = (
                  label.includes('下单人') ||
                  label.includes('联系人') ||
                  label.includes('客户') ||
                  label.includes('用户') ||
                  name.includes('name') && !name.includes('product')
                );
                
                return isProductRelated && !isCostRelated && !isPersonRelated;
              });

              let productFieldName = 'product'; // 默认字段名
              
              if (productFields.length > 0) {
                // 按优先级选择字段
                const priorityField = productFields.find(f => f.field_label.includes('产品名称')) ||
                                     productFields.find(f => f.field_label.includes('商品名称')) ||
                                     productFields.find(f => f.field_label.includes('产品')) ||
                                     productFields[0];
                productFieldName = priorityField.field_name;
              }

              // 获取所有订单进行手工统计验证
              db.all(
                `SELECT id, order_data FROM orders ${whereClause}`,
                queryParams,
                (err, allOrders: any[]) => {
                  if (err) {
                    console.error('获取订单数据失败:', err);
                    return reject(err);
                  }

                  const productAnalysis: Record<string, number> = {};
                  
                  allOrders.forEach((order) => {
                    try {
                      const orderData = JSON.parse(order.order_data);
                      const productValue = orderData[productFieldName];
                      
                      // 确定产品名称显示值
                      let productName = '未设置';
                      if (productValue !== undefined && productValue !== null && productValue !== '') {
                        productName = String(productValue).trim();
                        if (productName === '') {
                          productName = '未设置';
                        }
                      }
                      
                      // 统计
                      productAnalysis[productName] = (productAnalysis[productName] || 0) + 1;
                      
                    } catch (parseErr) {
                      console.error(`解析订单 ${order.id} 数据失败:`, parseErr);
                      productAnalysis['数据解析错误'] = (productAnalysis['数据解析错误'] || 0) + 1;
                    }
                  });
                  
                  resolve(productAnalysis);
                }
              );
            });
          }),
          
          // 计算总收入和月收入
          new Promise((resolve, reject) => {
            // 尝试从常见的金额字段获取收入数据
            db.all(
              `SELECT order_data FROM orders ${whereClause}`,
              queryParams,
              (err, rows: any[]) => {
                if (err) reject(err);
                else {
                  let totalRevenue = 0;
                  let monthRevenue = 0;
                  
                  rows.forEach((row: any) => {
                    const orderData = JSON.parse(row.order_data);
                    
                    // 查找可能的金额字段
                    const amountFields = ['amount', 'total_amount', 'price', 'order_amount', 'income', 'revenue', '到账金额', '订单金额'];
                    let orderAmount = 0;
                    
                    for (const field of amountFields) {
                      if (orderData[field] && !isNaN(parseFloat(orderData[field]))) {
                        orderAmount = parseFloat(orderData[field]);
                        break;
                      }
                    }
                    
                    totalRevenue += orderAmount;
                    
                    // 检查是否为本月订单
                    const orderDate = new Date(row.created_at || Date.now());
                    const now = new Date();
                    if (orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()) {
                      monthRevenue += orderAmount;
                    }
                  });
                  
                  resolve({ totalRevenue, monthRevenue });
                }
              }
            );
          })
        ];
        
        return Promise.all(distributionQueries)
          .then(([statusDistribution, shopDistribution, productDistribution, revenueData]: any[]) => {
            const avgOrderValue = totalOrders > 0 ? revenueData.totalRevenue / totalOrders : 0;
            
            res.json({
              totalOrders,
              todayOrders,
              unshippedOrders,
              exceptionOrders,
              weekOrders,
              monthOrders,
              yesterdayOrders,
              totalRevenue: revenueData.totalRevenue,
              monthRevenue: revenueData.monthRevenue,
              avgOrderValue,
              statusDistribution,
              shopDistribution,
              productDistribution
            });
          });
      })
      .catch(error => {
        console.error('获取统计数据失败:', error);
        res.status(500).json({ error: '获取统计数据失败' });
      });
    })
    .catch(error => {
      console.error('获取用户权限失败:', error);
      res.status(500).json({ error: '获取用户权限失败' });
    });
});

// Export orders to Excel
router.get('/export', authenticateToken, (req, res) => {
  // Get field definitions first (exclude hidden fields)
  db.all('SELECT * FROM field_definitions WHERE hidden = 0 OR hidden IS NULL ORDER BY sort_order ASC', (err, fields: any[]) => {
    if (err) {
      return res.status(500).json({ error: '获取字段定义失败' });
    }

    // Get all orders
    db.all(
      `SELECT o.*, 
              u1.username as created_by_username,
              u2.username as updated_by_username
       FROM orders o
       LEFT JOIN users u1 ON o.created_by = u1.id
       LEFT JOIN users u2 ON o.updated_by = u2.id
       ORDER BY o.created_at ASC`,
      (err, rows: any[]) => {
        if (err) {
          return res.status(500).json({ error: '获取订单失败' });
        }

        try {
          // Prepare data for export with security sanitization
          const exportData = rows.map((row) => {
            const orderData = sanitizeObject(JSON.parse(row.order_data));
            const exportRow: any = {
              '订单ID': row.id,
              '创建者': row.created_by_username,
              '创建时间': new Date(row.created_at).toLocaleString('zh-CN'),
              '更新时间': new Date(row.updated_at).toLocaleString('zh-CN')
            };

            // Add dynamic fields with sanitization
            fields.forEach(field => {
              let value = orderData[field.field_name];
              
              // Format different field types
              if (field.field_type === 'multiselect' && Array.isArray(value)) {
                value = value.join(', ');
              } else if (field.field_type === 'date' && value) {
                value = new Date(value).toLocaleDateString('zh-CN');
              } else if (field.field_type === 'currency' && value) {
                const currency = orderData[field.field_name + '_currency'] || '¥';
                value = `${currency}${parseFloat(value).toFixed(2)}`;
              }
              
              exportRow[field.field_label] = value || '';
            });

            return exportRow;
          });

          // Use safe Excel generation
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `订单导出_${timestamp}.xlsx`;
          const buffer = safeWriteExcel(exportData, filename, '订单数据');

          // Set response headers
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

          // Send the file
          res.send(buffer);

        } catch (error) {
          console.error('Export error:', error);
          res.status(500).json({ error: '导出失败: ' + (error as Error).message });
        }
      }
    );
  });
});

// Export orders to CSV
router.get('/export/csv', authenticateToken, (req, res) => {
  // Get field definitions first (exclude hidden fields)
  db.all('SELECT * FROM field_definitions WHERE hidden = 0 OR hidden IS NULL ORDER BY sort_order ASC', (err, fields: any[]) => {
    if (err) {
      return res.status(500).json({ error: '获取字段定义失败' });
    }

    // Get all orders
    db.all(
      `SELECT o.*, 
              u1.username as created_by_username,
              u2.username as updated_by_username
       FROM orders o
       LEFT JOIN users u1 ON o.created_by = u1.id
       LEFT JOIN users u2 ON o.updated_by = u2.id
       ORDER BY o.created_at ASC`,
      (err, rows: any[]) => {
        if (err) {
          return res.status(500).json({ error: '获取订单失败' });
        }

        try {
          // Prepare CSV headers
          const headers = [
            '订单ID',
            '创建者',
            '创建时间',
            '更新时间',
            ...fields.map(field => field.field_label)
          ];

          // Prepare CSV data
          const csvData = rows.map((row) => {
            const orderData = JSON.parse(row.order_data);
            const csvRow = [
              row.id,
              row.created_by_username,
              new Date(row.created_at).toLocaleString('zh-CN'),
              new Date(row.updated_at).toLocaleString('zh-CN')
            ];

            // Add dynamic fields
            fields.forEach(field => {
              let value = orderData[field.field_name];
              
              // Format different field types
              if (field.field_type === 'multiselect' && Array.isArray(value)) {
                value = value.join(', ');
              } else if (field.field_type === 'date' && value) {
                value = new Date(value).toLocaleDateString('zh-CN');
              } else if (field.field_type === 'currency' && value) {
                const currency = orderData[field.field_name + '_currency'] || '¥';
                value = `${currency}${parseFloat(value).toFixed(2)}`;
              }
              
              csvRow.push(value || '');
            });

            return csvRow;
          });

          // Convert to CSV format
          const csvContent = [headers, ...csvData]
            .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
            .join('\n');

          // Generate filename with timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `订单导出_${timestamp}.csv`;

          // Set response headers
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

          // Add BOM for proper Chinese display in Excel
          res.send('\uFEFF' + csvContent);

        } catch (error) {
          console.error('CSV Export error:', error);
          res.status(500).json({ error: 'CSV导出失败' });
        }
      }
    );
  });
});

// Get single order
router.get('/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;

  db.get(
    `SELECT o.*, 
            u1.username as created_by_username,
            u2.username as updated_by_username
     FROM orders o
     LEFT JOIN users u1 ON o.created_by = u1.id
     LEFT JOIN users u2 ON o.updated_by = u2.id
     WHERE o.id = ?`,
    [orderId],
    (err, row: any) => {
      if (err) {
        return res.status(500).json({ error: '获取订单失败' });
      }

      if (!row) {
        return res.status(404).json({ error: '订单不存在' });
      }

      const order = {
        ...row,
        order_data: JSON.parse(row.order_data)
      };

      res.json(order);
    }
  );
});

// Create order
router.post('/', authenticateToken, async (req, res) => {
  const { orderData } = req.body;
  const userId = req.user?.userId;

  if (!orderData) {
    return res.status(400).json({ error: '订单数据不能为空' });
  }

  try {
    // Get field definitions to check required fields
    const fields: any[] = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM field_definitions WHERE required = 1', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Validate required fields
    const missingFields: string[] = [];
    for (const field of fields) {
      const value = orderData[field.field_name];
      
      // Check if field is empty
      if (value === undefined || value === null || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        missingFields.push(field.field_label);
      }
      
      // Special handling for multiselect fields
      if (field.field_type === 'multiselect' && (!Array.isArray(value) || value.length === 0)) {
        if (!missingFields.includes(field.field_label)) {
          missingFields.push(field.field_label);
        }
      }
    }

    // If there are missing required fields, return error
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `请填写以下必填字段：${missingFields.join('、')}` 
      });
    }

    // First insert the order without order_id
    await new Promise<number>((resolve, reject) => {
      db.run(
        'INSERT INTO orders (order_data, created_by, updated_by) VALUES (?, ?, ?)',
        [JSON.stringify(orderData), userId, userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });

    // Regenerate all order IDs to maintain correct row numbers
    await regenerateOrderIds();

    res.status(201).json({
      message: '订单创建成功，编号已自动分配'
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// Update order
router.put('/:id', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const { orderData } = req.body;
  const userId = req.user?.userId;

  if (!orderData) {
    return res.status(400).json({ error: '订单数据不能为空' });
  }

  try {
    // Get field definitions to check required fields
    const fields: any[] = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM field_definitions WHERE required = 1', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Validate required fields
    const missingFields: string[] = [];
    for (const field of fields) {
      const value = orderData[field.field_name];
      
      // Check if field is empty
      if (value === undefined || value === null || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        missingFields.push(field.field_label);
      }
      
      // Special handling for multiselect fields
      if (field.field_type === 'multiselect' && (!Array.isArray(value) || value.length === 0)) {
        if (!missingFields.includes(field.field_label)) {
          missingFields.push(field.field_label);
        }
      }
    }

    // If there are missing required fields, return error
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `请填写以下必填字段：${missingFields.join('、')}` 
      });
    }

    // Get the current order data to compare if order_type or shop_name changed
    const currentOrder: any = await new Promise((resolve, reject) => {
      db.get(
        'SELECT order_data FROM orders WHERE id = ?',
        [orderId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!currentOrder) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const currentOrderData = JSON.parse(currentOrder.order_data);
    const orderTypeChanged = currentOrderData.order_type !== orderData.order_type;
    const shopNameChanged = currentOrderData.shop_name !== orderData.shop_name;

    // Update the order
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE orders SET order_data = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(orderData), userId, orderId],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) reject(new Error('订单不存在'));
          else resolve();
        }
      );
    });

    // If order_type or shop_name changed, regenerate all order IDs
    if (orderTypeChanged || shopNameChanged) {
      await regenerateOrderIds();
      res.json({ 
        message: '订单更新成功，编号已重新分配',
        regenerated: true 
      });
    } else {
      res.json({ 
        message: '订单更新成功',
        regenerated: false 
      });
    }

  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: '更新订单失败' });
  }
});

// Delete order
router.delete('/:id', authenticateToken, async (req, res) => {
  const orderId = req.params.id;

  try {
    // Check if user has permission (admin or creator)
    const orderRow: any = await new Promise((resolve, reject) => {
      db.get(
        'SELECT created_by FROM orders WHERE id = ?',
        [orderId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!orderRow) {
      return res.status(404).json({ error: '订单不存在' });
    }

    if (req.user?.role !== 'admin' && orderRow.created_by !== req.user?.userId) {
      return res.status(403).json({ error: '没有权限删除此订单' });
    }

    // Delete the order
    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM orders WHERE id = ?', [orderId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    // Regenerate all order IDs to maintain correct row numbers
    await regenerateOrderIds();

    res.json({ message: '订单删除成功，编号已重新分配' });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: '删除订单失败' });
  }
});

// 文件下载端点
router.get('/:id/download/:fieldName/:filename', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const fieldName = req.params.fieldName;
  const filename = req.params.filename;
  
  try {
    // 检查订单是否存在并获取文件列表
    const order: any = await new Promise((resolve, reject) => {
      db.get(
        'SELECT order_data FROM orders WHERE id = ?',
        [orderId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    const orderData = JSON.parse(order.order_data);
    let files = orderData[fieldName];
    
    // 兼容旧格式（单个文件名）和新格式（文件数组）
    if (!Array.isArray(files)) {
      files = files ? [files] : [];
    }
    
    // 检查文件是否在列表中
    if (!files.includes(filename)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 构造文件路径
    const filePath = path.join('uploads', 'orders', filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 获取原始文件名（去掉时间戳前缀）
    const originalName = filename.replace(/^\d+_/, '');
    
    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // 发送文件
    res.sendFile(path.resolve(filePath));
    
  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({ error: '文件下载失败' });
  }
});

// 删除单个文件端点
router.delete('/:id/file/:fieldName/:filename', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const fieldName = req.params.fieldName;
  const filename = req.params.filename;
  const userId = req.user?.userId;
  
  try {
    // 检查订单是否存在
    const order: any = await new Promise((resolve, reject) => {
      db.get(
        'SELECT order_data FROM orders WHERE id = ?',
        [orderId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 更新订单数据
    const orderData = JSON.parse(order.order_data);
    let currentFiles = orderData[fieldName];
    
    if (!Array.isArray(currentFiles)) {
      currentFiles = currentFiles ? [currentFiles] : [];
    }
    
    // 查找并移除指定文件
    const fileIndex = currentFiles.indexOf(filename);
    if (fileIndex === -1) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 从数组中移除文件
    currentFiles.splice(fileIndex, 1);
    orderData[fieldName] = currentFiles;
    
    // 更新数据库
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE orders SET order_data = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(orderData), userId, orderId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    // 删除物理文件
    const filePath = path.join('uploads', 'orders', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ 
      message: '文件删除成功',
      remainingFiles: currentFiles.length
    });
    
  } catch (error) {
    console.error('文件删除失败:', error);
    res.status(500).json({ error: '文件删除失败' });
  }
});

export default router; 