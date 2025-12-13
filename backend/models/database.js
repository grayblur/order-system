const Database = require('better-sqlite3');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  // 连接数据库
  connect() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database.db');
    console.log('数据库路径:', dbPath);

    try {
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      console.log('数据库连接成功');
      return Promise.resolve();
    } catch (err) {
      console.error('数据库连接失败:', err.message);
      return Promise.reject(err);
    }
  }

  // 初始化数据库表结构
  async initialize() {
    try {
      await this.connect();

      // 创建订单表
      this.run(`
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
      this.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          category TEXT NOT NULL,
          subcategory TEXT NOT NULL,
          product_category TEXT,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
        )
      `);

      // 检查并添加 product_category 字段（如果不存在）
      try {
        const columns = this.all(`PRAGMA table_info(order_items)`);
        const hasProductCategory = columns.some(col => col.name === 'product_category');
        if (!hasProductCategory) {
          this.run(`ALTER TABLE order_items ADD COLUMN product_category TEXT`);
          console.log('✅ 已添加 product_category 字段到 order_items 表');
        }
      } catch (error) {
        console.log('检查/添加 product_category 字段时出错:', error.message);
      }

      // 创建商品目录表
      this.run(`
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

      // 创建打印记录表
      this.run(`
        CREATE TABLE IF NOT EXISTS print_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          print_date TEXT NOT NULL,
          print_type TEXT NOT NULL DEFAULT 'production_list',
          status TEXT NOT NULL DEFAULT 'success',
          order_count INTEGER DEFAULT 0,
          printed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          order_ids TEXT -- 存储打印的订单ID列表，逗号分隔
        )
      `);

      // 检查并添加 order_ids 字段（如果不存在）
      try {
        const columns = this.all(`PRAGMA table_info(print_records)`);
        const hasOrderIds = columns.some(col => col.name === 'order_ids');
        if (!hasOrderIds) {
          this.run(`ALTER TABLE print_records ADD COLUMN order_ids TEXT`);
          console.log('✅ 已添加 order_ids 字段到 print_records 表');
        }
      } catch (error) {
        console.log('检查/添加 order_ids 字段时出错:', error.message);
      }

      // 创建快捷输入表
      this.run(`
        CREATE TABLE IF NOT EXISTS quick_inputs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'text',
          is_active BOOLEAN DEFAULT 1,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);
      return { id: result.lastInsertRowid, changes: result.changes };
    } catch (err) {
      throw err;
    }
  }

  // 查询单条记录
  get(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (err) {
      throw err;
    }
  }

  // 查询多条记录
  all(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (err) {
      throw err;
    }
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

  // 执行事务（better-sqlite3原生支持）
  transaction(fn) {
    return this.db.transaction(fn)();
  }

  // 关闭数据库连接
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        try {
          this.db.close();
          console.log('数据库连接已关闭');
          resolve();
        } catch (err) {
          reject(err);
        }
      } else {
        resolve();
      }
    });
  }
}

// 创建单例实例
const database = new DatabaseManager();

module.exports = database;