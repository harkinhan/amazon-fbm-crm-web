import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../database';
import { authenticateToken, requireRole } from '../middleware/auth';
import { config } from '../config';

const router = Router();

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const avatarDir = path.join(config.uploadPath, 'avatars');
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }
    cb(null, avatarDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const avatarUpload = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片文件 (jpeg, jpg, png, gif)'));
    }
  }
});

// Get all shops (for permission assignment)
router.get('/shops', authenticateToken, requireRole(['admin']), (req, res) => {
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
});

// Get all users with shop permissions (admin only)
router.get('/', authenticateToken, requireRole(['admin']), (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.email, u.role, u.avatar, u.phone, u.gender, 
            u.birth_date, u.hire_date, u.department, u.position, u.emergency_contact, 
            u.emergency_phone, u.address, u.bio, u.status, u.created_at, u.updated_at,
            GROUP_CONCAT(usp.shop_name) as shop_permissions
     FROM users u 
     LEFT JOIN user_shop_permissions usp ON u.id = usp.user_id 
     GROUP BY u.id 
     ORDER BY u.created_at DESC`,
    (err, rows: any[]) => {
      if (err) {
        return res.status(500).json({ error: '获取用户列表失败' });
      }
      
      const users = rows.map(row => ({
        ...row,
        shop_permissions: row.shop_permissions ? row.shop_permissions.split(',') : []
      }));
      
      res.json(users);
    }
  );
});

// Get single user (admin only)
router.get('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const userId = req.params.id;

  db.get(
    `SELECT u.id, u.username, u.email, u.role, u.avatar, u.phone, u.gender, 
            u.birth_date, u.hire_date, u.department, u.position, u.emergency_contact, 
            u.emergency_phone, u.address, u.bio, u.status, u.created_at, u.updated_at
     FROM users u WHERE u.id = ?`,
    [userId],
    (err, user: any) => {
      if (err) {
        return res.status(500).json({ error: '获取用户信息失败' });
      }

      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }

      // Get user shop permissions
      db.all(
        'SELECT shop_name FROM user_shop_permissions WHERE user_id = ?',
        [userId],
        (err, permissions: any[]) => {
          if (err) {
            return res.status(500).json({ error: '获取用户权限失败' });
          }

          const userWithPermissions = {
            ...user,
            shop_permissions: permissions.map(p => p.shop_name)
          };

          res.json(userWithPermissions);
        }
      );
    }
  );
});

// Upload avatar
router.post('/:id/avatar', authenticateToken, requireRole(['admin']), avatarUpload.single('avatar'), (req, res) => {
  const userId = req.params.id;
  
  if (!req.file) {
    return res.status(400).json({ error: '请选择头像文件' });
  }

  // Get old avatar to delete
  db.get('SELECT avatar FROM users WHERE id = ?', [userId], (err, row: any) => {
    if (err) {
      return res.status(500).json({ error: '获取用户信息失败' });
    }

    // Delete old avatar file if exists
    if (row && row.avatar) {
      const oldAvatarPath = path.join(config.uploadPath, 'avatars', row.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user avatar - add explicit check for req.file
    if (!req.file) {
      return res.status(400).json({ error: '头像文件上传失败' });
    }

    db.run(
      'UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.file.filename, userId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '更新头像失败' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ 
          message: '头像上传成功',
          avatar: req.file!.filename
        });
      }
    );
  });
});

// Create user (admin only)
router.post('/', authenticateToken, requireRole(['admin']), (req, res) => {
  const { 
    username, email, password, role, phone, gender, birth_date, hire_date,
    department, position, emergency_contact, emergency_phone, address, bio,
    shop_permissions = []
  } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: '用户名、邮箱、密码和角色都是必填的' });
  }

  if (!['admin', 'operator', 'tracker', 'designer'].includes(role)) {
    return res.status(400).json({ error: '无效的用户角色' });
  }

  if (gender && !['male', 'female', 'other'].includes(gender)) {
    return res.status(400).json({ error: '无效的性别' });
  }

  // 验证密码强度
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (username, email, password, role, phone, gender, birth_date, hire_date,
                       department, position, emergency_contact, emergency_phone, address, bio, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [username, email, hashedPassword, role, phone, gender, birth_date, hire_date,
     department, position, emergency_contact, emergency_phone, address, bio],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '用户名或邮箱已存在' });
        }
        return res.status(500).json({ error: '创建用户失败' });
      }

      const userId = this.lastID;

      // Add shop permissions
      if (shop_permissions && shop_permissions.length > 0) {
        // 使用Promise.all来处理所有权限插入，避免多次响应
        const insertPromises = shop_permissions.map((shop: string) => {
          return new Promise<void>((resolve, reject) => {
            db.run(
              'INSERT INTO user_shop_permissions (user_id, shop_name) VALUES (?, ?)',
              [userId, shop],
              (err) => {
                if (err) {
                  console.error('添加店铺权限失败:', err, 'shop:', shop);
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
        });

        Promise.all(insertPromises)
          .then(() => {
            res.status(201).json({
              message: '用户创建成功',
              userId: userId
            });
          })
          .catch((error) => {
            console.error('批量添加权限失败:', error);
            res.status(500).json({ error: '添加店铺权限失败' });
          });
      } else {
        res.status(201).json({
          message: '用户创建成功',
          userId: userId
        });
      }
    }
  );
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const userId = req.params.id;
  const { 
    username, email, role, password, phone, gender, birth_date, hire_date,
    department, position, emergency_contact, emergency_phone, address, bio,
    status, shop_permissions = []
  } = req.body;

  if (!username || !email || !role) {
    return res.status(400).json({ error: '用户名、邮箱和角色都是必填的' });
  }

  if (!['admin', 'operator', 'tracker', 'designer'].includes(role)) {
    return res.status(400).json({ error: '无效的用户角色' });
  }

  if (gender && !['male', 'female', 'other'].includes(gender)) {
    return res.status(400).json({ error: '无效的性别' });
  }

  if (status && !['active', 'inactive', 'suspended'].includes(status)) {
    return res.status(400).json({ error: '无效的用户状态' });
  }

  let updateQuery = `UPDATE users SET username = ?, email = ?, role = ?, phone = ?, gender = ?, 
                     birth_date = ?, hire_date = ?, department = ?, position = ?, emergency_contact = ?, 
                     emergency_phone = ?, address = ?, bio = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
  let params = [username, email, role, phone, gender, birth_date, hire_date, department, position, 
                emergency_contact, emergency_phone, address, bio, status || 'active', userId];

  // 如果提供了新密码，则更新密码
  if (password && password.trim() !== '') {
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    updateQuery = `UPDATE users SET username = ?, email = ?, role = ?, password = ?, phone = ?, gender = ?, 
                   birth_date = ?, hire_date = ?, department = ?, position = ?, emergency_contact = ?, 
                   emergency_phone = ?, address = ?, bio = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
                   WHERE id = ?`;
    params = [username, email, role, hashedPassword, phone, gender, birth_date, hire_date, department, 
              position, emergency_contact, emergency_phone, address, bio, status || 'active', userId];
  }

  db.run(updateQuery, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: '用户名或邮箱已存在' });
      }
      return res.status(500).json({ error: '更新用户失败' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // Update shop permissions
    db.run('DELETE FROM user_shop_permissions WHERE user_id = ?', [userId], (err) => {
      if (err) {
        console.error('删除旧权限失败:', err);
        return res.status(500).json({ error: '更新权限失败' });
      }

      if (shop_permissions && shop_permissions.length > 0) {
        // 使用Promise.all来处理所有权限插入，避免多次响应
        const insertPromises = shop_permissions.map((shop: string) => {
          return new Promise<void>((resolve, reject) => {
            db.run(
              'INSERT INTO user_shop_permissions (user_id, shop_name) VALUES (?, ?)',
              [userId, shop],
              (err) => {
                if (err) {
                  console.error('添加店铺权限失败:', err, 'shop:', shop);
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
        });

        Promise.all(insertPromises)
          .then(() => {
            // 获取更新后的完整用户信息
            db.get(
              `SELECT u.id, u.username, u.email, u.role, u.avatar, u.phone, u.gender, 
                      u.birth_date, u.hire_date, u.department, u.position, u.emergency_contact, 
                      u.emergency_phone, u.address, u.bio, u.status, u.created_at, u.updated_at
               FROM users u WHERE u.id = ?`,
              [userId],
              (err, user: any) => {
                if (err) {
                  return res.status(500).json({ error: '获取更新后的用户信息失败' });
                }

                const userWithPermissions = {
                  ...user,
                  shop_permissions: shop_permissions
                };

                res.json({ 
                  message: '用户更新成功',
                  user: userWithPermissions
                });
              }
            );
          })
          .catch((error) => {
            console.error('批量添加权限失败:', error);
            res.status(500).json({ error: '添加店铺权限失败' });
          });
      } else {
        // 获取更新后的完整用户信息（无店铺权限）
        db.get(
          `SELECT u.id, u.username, u.email, u.role, u.avatar, u.phone, u.gender, 
                  u.birth_date, u.hire_date, u.department, u.position, u.emergency_contact, 
                  u.emergency_phone, u.address, u.bio, u.status, u.created_at, u.updated_at
           FROM users u WHERE u.id = ?`,
          [userId],
          (err, user: any) => {
            if (err) {
              return res.status(500).json({ error: '获取更新后的用户信息失败' });
            }

            const userWithPermissions = {
              ...user,
              shop_permissions: []
            };

            res.json({ 
              message: '用户更新成功',
              user: userWithPermissions
            });
          }
        );
      }
    });
  });
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const userId = req.params.id;
  const currentUserId = req.user?.userId;

  // 防止删除自己
  if (parseInt(userId) === currentUserId) {
    return res.status(400).json({ error: '不能删除自己的账户' });
  }

  // Get user info to delete avatar
  db.get('SELECT avatar FROM users WHERE id = ?', [userId], (err, row: any) => {
    if (err) {
      return res.status(500).json({ error: '删除用户失败' });
    }

    if (!row) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // Delete avatar file if exists
    if (row.avatar) {
      const avatarPath = path.join(config.uploadPath, 'avatars', row.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Delete user (shop permissions will be deleted by CASCADE)
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        return res.status(500).json({ error: '删除用户失败' });
      }

      res.json({ message: '用户删除成功' });
    });
  });
});

// Reset password (admin only)
router.post('/:id/reset-password', authenticateToken, requireRole(['admin']), (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: '新密码不能为空' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  db.run(
    'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [hashedPassword, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: '重置密码失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }

      res.json({ message: '密码重置成功' });
    }
  );
});

export default router; 