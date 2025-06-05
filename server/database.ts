import sqlite3 from 'sqlite3';
import { config } from './config';
import bcrypt from 'bcryptjs';

const db = new sqlite3.Database(config.dbPath);

// Initialize database tables
export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check for user table migration needs
      db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        const needsUserMigration = row && (
          !row.sql.includes('avatar') || 
          !row.sql.includes('phone') || 
          !row.sql.includes('gender') || 
          !row.sql.includes('birth_date') ||
          !row.sql.includes('hire_date') ||
          !row.sql.includes('department') ||
          !row.sql.includes('position') ||
          !row.sql.includes('emergency_contact') ||
          !row.sql.includes('address')
        );

        if (needsUserMigration && row) {
          console.log('🔄 检测到用户表需要迁移以支持新的个人信息字段...');
          
          // Add new columns one by one
          const newColumns = [
            'avatar TEXT', // 头像文件名
            'phone TEXT', // 手机号
            'gender TEXT CHECK(gender IN ("male", "female", "other"))', // 性别
            'birth_date DATE', // 出生年月
            'hire_date DATE', // 入职时间
            'department TEXT', // 部门
            'position TEXT', // 职位
            'emergency_contact TEXT', // 紧急联系人
            'emergency_phone TEXT', // 紧急联系人电话
            'address TEXT', // 地址
            'bio TEXT', // 个人简介
            'status TEXT CHECK(status IN ("active", "inactive", "suspended")) DEFAULT "active"' // 用户状态
          ];

          let completedMigrations = 0;
          newColumns.forEach((column) => {
            db.run(`ALTER TABLE users ADD COLUMN ${column}`, (err) => {
              if (err && !err.message.includes('duplicate column name')) {
                console.error(`添加列 ${column} 失败:`, err);
              }
              completedMigrations++;
              if (completedMigrations === newColumns.length) {
                console.log('✅ 用户表迁移完成，现在支持更多个人信息字段');
                continueInitialization();
              }
            });
          });
        } else {
          // Users table
          db.run(`
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              role TEXT CHECK(role IN ('admin', 'operator', 'tracker', 'designer')) NOT NULL,
              avatar TEXT,
              phone TEXT,
              gender TEXT CHECK(gender IN ('male', 'female', 'other')),
              birth_date DATE,
              hire_date DATE,
              department TEXT,
              position TEXT,
              emergency_contact TEXT,
              emergency_phone TEXT,
              address TEXT,
              bio TEXT,
              status TEXT CHECK(status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, () => {
            continueInitialization();
          });
        }
      });

      function continueInitialization() {
        // User shop permissions table
        db.run(`
          CREATE TABLE IF NOT EXISTS user_shop_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            shop_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(user_id, shop_name)
          )
        `);

        // Check if field_definitions table exists and if it needs migration
        db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='field_definitions'", (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          const needsTypeMigration = row && (!row.sql.includes("'number'") || !row.sql.includes("'formula'"));
          const needsHiddenMigration = row && !row.sql.includes("hidden");
          
          if (needsTypeMigration) {
            console.log('🔄 检测到数据库需要迁移以支持数值字段类型...');
            
            // Migrate field_definitions table to support 'number' type
            db.serialize(() => {
              // Create new table with updated schema
              db.run(`
                CREATE TABLE field_definitions_new (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  field_name TEXT UNIQUE NOT NULL,
                  field_label TEXT NOT NULL,
                  field_type TEXT CHECK(field_type IN ('text', 'number', 'currency', 'select', 'date', 'multiselect', 'richtext', 'file', 'formula')) NOT NULL,
                  options TEXT,
                  required BOOLEAN DEFAULT FALSE,
                  sort_order INTEGER DEFAULT 0,
                  hidden BOOLEAN DEFAULT FALSE,
                  created_by INTEGER NOT NULL,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (created_by) REFERENCES users (id)
                )
              `);

              // Copy data from old table to new table
              db.run(`
                INSERT INTO field_definitions_new 
                SELECT *, FALSE as hidden FROM field_definitions
              `);

              // Drop old table
              db.run(`DROP TABLE field_definitions`);

              // Rename new table
              db.run(`ALTER TABLE field_definitions_new RENAME TO field_definitions`);

              console.log('✅ 数据库迁移完成，现在支持数值字段类型和隐藏字段');
              finalizeDatabaseInit();
            });
          } else if (needsHiddenMigration) {
            console.log('🔄 检测到数据库需要迁移以支持隐藏字段...');
            
            // Add hidden column to existing table
            db.run(`ALTER TABLE field_definitions ADD COLUMN hidden BOOLEAN DEFAULT FALSE`, (err) => {
              if (err && !err.message.includes('duplicate column name')) {
                console.error('隐藏字段迁移错误:', err);
              } else {
                console.log('✅ 数据库迁移完成，现在支持隐藏字段');
              }
              finalizeDatabaseInit();
            });
          } else {
            // Field definitions table
            db.run(`
              CREATE TABLE IF NOT EXISTS field_definitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                field_name TEXT UNIQUE NOT NULL,
                field_label TEXT NOT NULL,
                field_type TEXT CHECK(field_type IN ('text', 'number', 'currency', 'select', 'date', 'multiselect', 'richtext', 'file', 'formula')) NOT NULL,
                options TEXT,
                required BOOLEAN DEFAULT FALSE,
                sort_order INTEGER DEFAULT 0,
                hidden BOOLEAN DEFAULT FALSE,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (id)
              )
            `);
            finalizeDatabaseInit();
          }
        });
      }

      function finalizeDatabaseInit() {
        // Orders table - dynamic structure based on field definitions
        db.run(`
          CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_data TEXT NOT NULL,
            created_by INTEGER NOT NULL,
            updated_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users (id),
            FOREIGN KEY (updated_by) REFERENCES users (id)
          )
        `);

        // File uploads table
        db.run(`
          CREATE TABLE IF NOT EXISTS file_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_name TEXT NOT NULL,
            filename TEXT NOT NULL,
            mimetype TEXT NOT NULL,
            size INTEGER NOT NULL,
            order_id INTEGER,
            field_name TEXT,
            uploaded_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders (id),
            FOREIGN KEY (uploaded_by) REFERENCES users (id)
          )
        `);

        // Create default admin user
        const defaultAdminPassword = bcrypt.hashSync('admin123', 10);
        db.run(`
          INSERT OR IGNORE INTO users (username, email, password, role, department, position, hire_date)
          VALUES ('admin', 'admin@crm.com', ?, 'admin', '管理部门', '系统管理员', date('now'))
        `, [defaultAdminPassword], function(err) {
          if (err) {
            reject(err);
          } else {
            console.log('✅ 数据库初始化完成');
            console.log('📧 默认管理员账户: admin@crm.com');
            console.log('🔐 默认密码: admin123');
            console.log('');
            console.log('🎯 系统初始化为空白状态，请使用管理员账户登录后自定义字段配置');
            console.log('📝 字段管理：完全空白，由管理员自定义');
            console.log('🔒 字段名一旦创建不可修改，确保数据完整性');
            resolve();
          }
        });
      }
    });
  });
};

export default db; 