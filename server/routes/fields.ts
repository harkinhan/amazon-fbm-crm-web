import { Router } from 'express';
import db from '../database';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Get all field definitions
router.get('/', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM field_definitions ORDER BY sort_order ASC',
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: '获取字段定义失败' });
      }
      
      const fields = rows.map((row: any) => ({
        ...row,
        options: row.options ? JSON.parse(row.options) : null
      }));
      
      res.json(fields);
    }
  );
});

// Update field sort order (admin only) - 必须在 /:id 路由之前
router.put('/sort-order', authenticateToken, requireRole(['admin']), (req, res) => {
  const { fields } = req.body;

  if (!Array.isArray(fields)) {
    return res.status(400).json({ error: '字段排序数据格式错误' });
  }

  // 验证数据格式
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!field.id || field.sortOrder === undefined || field.sortOrder === null) {
      return res.status(400).json({ error: `字段数据格式错误: 索引 ${i}` });
    }
  }

  // 更新数据库
  const updatePromises = fields.map(field => {
    return new Promise((resolve, reject) => {
      const id = Number(field.id);
      const sortOrder = Number(field.sortOrder);
      
      db.run(
        'UPDATE field_definitions SET sort_order = ? WHERE id = ?',
        [sortOrder, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  });

  Promise.all(updatePromises)
    .then(() => {
      res.json({ message: '排序更新成功' });
    })
    .catch(error => {
      console.error('排序更新失败:', error);
      res.status(500).json({ error: '排序更新失败' });
    });
});

// Create field definition (admin only)
router.post('/', authenticateToken, requireRole(['admin']), (req, res) => {
  const { fieldName, fieldLabel, fieldType, options, required, sortOrder, hidden } = req.body;
  const userId = req.user?.userId;

  if (!fieldName || !fieldLabel || !fieldType) {
    return res.status(400).json({ error: '字段名、标签和类型都是必填的' });
  }

  const allowedTypes = ['text', 'number', 'currency', 'select', 'date', 'multiselect', 'richtext', 'file', 'formula'];
  if (!allowedTypes.includes(fieldType)) {
    return res.status(400).json({ error: '无效的字段类型' });
  }

  db.run(
    `INSERT INTO field_definitions 
     (field_name, field_label, field_type, options, required, sort_order, hidden, created_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fieldName,
      fieldLabel,
      fieldType,
      options ? JSON.stringify(options) : null,
      required || false,
      sortOrder || 0,
      hidden || false,
      userId
    ],
    function(err) {
      if (err) {
        console.error('字段创建错误:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '字段名已存在' });
        }
        return res.status(500).json({ error: `创建字段失败: ${err.message}` });
      }

      res.status(201).json({
        message: '字段创建成功',
        fieldId: this.lastID
      });
    }
  );
});

// Update field definition (admin only) - 必须在 sort-order 路由之后
router.put('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const fieldId = req.params.id;
  const { fieldLabel, fieldType, options, required, sortOrder, hidden } = req.body;

  if (!fieldLabel || !fieldType) {
    return res.status(400).json({ error: '字段标签和类型都是必填的' });
  }

  const allowedTypes = ['text', 'number', 'currency', 'select', 'date', 'multiselect', 'richtext', 'file', 'formula'];
  if (!allowedTypes.includes(fieldType)) {
    return res.status(400).json({ error: '无效的字段类型' });
  }

  db.run(
    `UPDATE field_definitions 
     SET field_label = ?, field_type = ?, options = ?, required = ?, sort_order = ?, hidden = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      fieldLabel,
      fieldType,
      options ? JSON.stringify(options) : null,
      required || false,
      sortOrder || 0,
      hidden !== undefined ? hidden : false,
      fieldId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: '更新字段失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '字段不存在' });
      }

      res.json({ message: '字段更新成功' });
    }
  );
});

// Delete field definition (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const fieldId = req.params.id;

  db.run('DELETE FROM field_definitions WHERE id = ?', [fieldId], function(err) {
    if (err) {
      return res.status(500).json({ error: '删除字段失败' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '字段不存在' });
    }

    res.json({ message: '字段删除成功' });
  });
});

export default router; 