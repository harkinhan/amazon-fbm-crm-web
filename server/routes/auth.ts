import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database';
import { config } from '../config';
import { User, UserAuth } from '../types';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get current user info
router.get('/me', authenticateToken, (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: '未授权' });
  }

  db.get(
    'SELECT * FROM users WHERE id = ?',
    [userId],
    (err, row: User) => {
      if (err) {
        return res.status(500).json({ error: '获取用户信息失败' });
      }

      if (!row) {
        return res.status(404).json({ error: '用户不存在' });
      }

      // 获取用户的店铺权限
      db.all(
        'SELECT shop_name FROM user_shop_permissions WHERE user_id = ?',
        [row.id],
        (err, permissions: any[]) => {
          if (err) {
            console.error('获取用户权限失败:', err);
            return res.status(500).json({ error: '获取用户信息失败' });
          }

          const shop_permissions = permissions.map(p => p.shop_name);

          res.json({
            user: { 
              id: row.id, 
              username: row.username, 
              email: row.email, 
              role: row.role,
              phone: row.phone,
              gender: row.gender,
              birth_date: row.birth_date,
              hire_date: row.hire_date,
              department: row.department,
              position: row.position,
              emergency_contact: row.emergency_contact,
              emergency_phone: row.emergency_phone,
              address: row.address,
              bio: row.bio,
              status: row.status,
              shop_permissions: shop_permissions
            }
          });
        }
      );
    }
  );
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码都是必填的' });
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, row: User) => {
      if (err) {
        return res.status(500).json({ error: '登录失败' });
      }

      if (!row || !bcrypt.compareSync(password, row.password)) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      // 获取用户的店铺权限
      db.all(
        'SELECT shop_name FROM user_shop_permissions WHERE user_id = ?',
        [row.id],
        (err, permissions: any[]) => {
          if (err) {
            console.error('获取用户权限失败:', err);
            return res.status(500).json({ error: '登录失败' });
          }

          const shop_permissions = permissions.map(p => p.shop_name);

          const token = jwt.sign(
            { userId: row.id, username: row.username, email: row.email, role: row.role },
            config.jwtSecret,
            { expiresIn: '24h' }
          );

          res.json({
            message: '登录成功',
            token,
            user: { 
              id: row.id, 
              username: row.username, 
              email: row.email, 
              role: row.role,
              phone: row.phone,
              gender: row.gender,
              birth_date: row.birth_date,
              hire_date: row.hire_date,
              department: row.department,
              position: row.position,
              emergency_contact: row.emergency_contact,
              emergency_phone: row.emergency_phone,
              address: row.address,
              bio: row.bio,
              status: row.status,
              shop_permissions: shop_permissions
            }
          });
        }
      );
    }
  );
});

export default router; 