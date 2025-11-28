const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  // 连接数据库
  connect() {
    return new Promise((resolve, reject) => {
      const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database.db');
      console.log('数据库路径:', dbPath);

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err.message);
          reject(err);
        } else {
          console.log('数据库连接成功');
          resolve();
        }
      });
    });
  }

  // 初始化数据库表结构
  async initialize() {
    try {
      await this.connect();

      // 创建订单表
      await this.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          customer_address TEXT,
          customer_phone TEXT NOT NULL,
          delivery_date TEXT NOT NULL,
          notes TEXT,
          total_amount REAL NOT NULL DEFAULT 0,
          paid_amount REAL NOT NULL DEFAULT 0,
          payment_status TEXT NOT NULL DEFAULT '未支付',
          order_status TEXT NOT NULL DEFAULT '待确认',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建订单项目表
      await this.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          category TEXT NOT NULL,
          subcategory TEXT NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
        )
      `);

      // 创建商品目录表
      await this.run(`
        CREATE TABLE IF NOT EXISTS goods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          subcategory TEXT NOT NULL,
          product_name TEXT NOT NULL,
          price REAL NOT NULL,
          unit TEXT NOT NULL DEFAULT '个',
          description TEXT,
          is_available BOOLEAN DEFAULT 1,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(category, subcategory, product_name)
        )
      `);

      console.log('数据库表结构初始化完成');

      // 检查是否需要导入初始数据
      await this.importInitialData();

    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  // 导入初始商品数据（暂时简化，避免解析错误）
  async importInitialData() {
    try {
      console.log('跳过初始商品数据导入，确保服务正常启动');
      // TODO: 修复商品数据导入逻辑
    } catch (error) {
      console.warn('导入初始商品数据时出错:', error.message);
    }
  }

  // 执行SQL语句
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // 查询单条记录
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 查询多条记录
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 开始事务
  beginTransaction() {
    return this.run('BEGIN TRANSACTION');
  }

  // 提交事务
  commit() {
    return this.run('COMMIT');
  }

  // 回滚事务
  rollback() {
    return this.run('ROLLBACK');
  }

  // 关闭数据库连接
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('数据库连接已关闭');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// 创建单例实例
const database = new Database();

module.exports = database;