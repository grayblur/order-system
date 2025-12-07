const express = require('express');
const router = express.Router();
const database = require('../models/database');

// 获取订单列表
router.get('/', async (req, res) => {
  try {
    const { date, status, page = 1, limit = 20 } = req.query;
    let sql = `
      SELECT
        o.*,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params = [];

    // 按日期筛选
    if (date) {
      sql += ` AND o.delivery_date = ?`;
      params.push(date);
    }

    // 按状态筛选
    if (status) {
      sql += ` AND o.order_status = ?`;
      params.push(status);
    }

    sql += ` GROUP BY o.id ORDER BY o.created_at DESC`;

    // 分页
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const orders = await database.all(sql, params);

    // 获取总数
    let countSql = `SELECT COUNT(DISTINCT id) as total FROM orders WHERE 1=1`;
    const countParams = [];
    if (date) {
      countSql += ` AND delivery_date = ?`;
      countParams.push(date);
    }
    if (status) {
      countSql += ` AND order_status = ?`;
      countParams.push(status);
    }

    const countResult = await database.get(countSql, countParams);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单列表失败',
      message: error.message
    });
  }
});

// 获取打印记录 - 必须放在 /:id 路由之前
router.get('/print-records', async (req, res) => {
  try {
    const { date, page = 1, limit = 20 } = req.query;
    let sql = `
      SELECT * FROM print_records
      WHERE 1=1
    `;
    const params = [];

    // 按日期筛选
    if (date) {
      sql += ` AND print_date = ?`;
      params.push(date);
    }

    sql += ` ORDER BY printed_at DESC`;

    // 分页
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const records = await database.all(sql, params);

    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM print_records WHERE 1=1`;
    const countParams = [];
    if (date) {
      countSql += ` AND print_date = ?`;
      countParams.push(date);
    }

    const countResult = await database.get(countSql, countParams);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取打印记录失败:', error);
    res.status(500).json({
      success: false,
      error: '获取打印记录失败',
      message: error.message
    });
  }
});

// 获取生产单（按日期分组打印） - 必须放在 /:id 路由之前
router.get('/production/:date', async (req, res) => {
  try {
    const date = req.params.date;

    const orders = await database.all(`
      SELECT
        o.*,
        oi.product_name,
        oi.quantity,
        oi.unit_price
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.delivery_date = ?
      ORDER BY o.customer_name, oi.product_name
    `, [date]);

    // 按客户分组
    const productionList = {};
    orders.forEach(order => {
      const customerId = order.id;
      if (!productionList[customerId]) {
        productionList[customerId] = {
          customer_info: {
            name: order.customer_name,
            address: order.customer_address,
            phone: order.customer_phone,
            delivery_date: order.delivery_date,
            notes: order.notes,
            total_amount: order.total_amount,
            paid_amount: order.paid_amount,
            payment_status: order.payment_status,
            order_status: order.order_status
          },
          items: []
        };
      }

      if (order.product_name) {
        productionList[customerId].items.push({
          name: order.product_name,
          quantity: order.quantity,
          unit_price: order.unit_price
        });
      }
    });

    res.json({
      success: true,
      data: Object.values(productionList),
      date,
      total_orders: Object.keys(productionList).length
    });
  } catch (error) {
    console.error('获取生产单失败:', error);
    res.status(500).json({
      success: false,
      error: '获取生产单失败',
      message: error.message
    });
  }
});

// 获取单个订单详情
router.get('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;

    // 获取订单基本信息
    const order = await database.get(`
      SELECT * FROM orders WHERE id = ?
    `, [orderId]);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 获取订单项目
    const items = await database.all(`
      SELECT * FROM order_items WHERE order_id = ?
    `, [orderId]);

    res.json({
      success: true,
      data: {
        ...order,
        items
      }
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单详情失败',
      message: error.message
    });
  }
});

// 创建新订单
router.post('/', async (req, res) => {
  try {
    const {
      customer_name,
      customer_address,
      customer_phone,
      delivery_date,
      notes,
      items,
      isPaid
    } = req.body;

    // 验证必填字段
    if (!customer_name || !customer_phone || !delivery_date || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请填写完整的订单信息'
      });
    }

    // 验证配送日期：不能是过去的日期
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 重置到今天的开始
    const deliveryDate = new Date(delivery_date);
    deliveryDate.setHours(0, 0, 0, 0); // 重置到配送日期的开始

    if (deliveryDate < today) {
      return res.status(400).json({
        success: false,
        error: '配送日期不能早于今天',
        details: `选择的日期: ${delivery_date}, 今天: ${today.toISOString().split('T')[0]}`
      });
    }

    // 开始事务
    await database.beginTransaction();

    // 计算总金额
    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    // 根据前端传递的付款状态设置付款信息
    let paid_amount, payment_status;
    if (isPaid) {
      paid_amount = total_amount;
      payment_status = '已支付';
    } else {
      paid_amount = 0;
      payment_status = '未支付';
    }

    // 插入订单
    const orderResult = await database.run(`
      INSERT INTO orders (
        customer_name, customer_address, customer_phone,
        delivery_date, notes, total_amount, paid_amount,
        payment_status, order_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customer_name,
      customer_address || '',
      customer_phone,
      delivery_date,
      notes || '',
      total_amount,
      paid_amount,
      payment_status,
      '待确认'
    ]);

    const orderId = orderResult.id;

    // 插入订单项目
    for (const item of items) {
      await database.run(`
        INSERT INTO order_items (
          order_id, category, subcategory, product_name,
          quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        item.category,
        item.subcategory,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.quantity * item.unit_price
      ]);
    }

    // 提交事务
    await database.commit();

    res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: {
        id: orderId,
        total_amount
      }
    });
  } catch (error) {
    await database.rollback();
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      error: '创建订单失败',
      message: error.message
    });
  }
});

// 记录打印操作 - 必须放在 /:id 路由之前
router.post('/print', async (req, res) => {
  try {
    const { print_date, print_type = 'production_list', notes } = req.body;

    // 验证必填字段
    if (!print_date) {
      return res.status(400).json({
        success: false,
        error: '打印日期不能为空'
      });
    }

    // 获取该日期的订单数量
    const orderCountResult = await database.get(`
      SELECT COUNT(DISTINCT id) as count FROM orders WHERE delivery_date = ?
    `, [print_date]);

    const orderCount = orderCountResult.count || 0;

    // 记录打印操作
    const result = await database.run(`
      INSERT INTO print_records (print_date, print_type, status, order_count, notes)
      VALUES (?, ?, 'success', ?, ?)
    `, [print_date, print_type, orderCount, notes || '']);

    res.json({
      success: true,
      message: '打印记录保存成功',
      data: {
        id: result.id,
        print_date,
        print_type,
        order_count: orderCount,
        printed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('保存打印记录失败:', error);
    res.status(500).json({
      success: false,
      error: '保存打印记录失败',
      message: error.message
    });
  }
});

// 更新订单
router.put('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const {
      customer_name,
      customer_address,
      customer_phone,
      delivery_date,
      notes,
      paid_amount,
      payment_status,
      order_status
    } = req.body;

    // 检查订单是否存在
    const existingOrder = await database.get('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 更新订单信息
    await database.run(`
      UPDATE orders SET
        customer_name = ?,
        customer_address = ?,
        customer_phone = ?,
        delivery_date = ?,
        notes = ?,
        paid_amount = COALESCE(?, paid_amount),
        payment_status = COALESCE(?, payment_status),
        order_status = COALESCE(?, order_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      customer_name,
      customer_address,
      customer_phone,
      delivery_date,
      notes,
      paid_amount,
      payment_status,
      order_status,
      orderId
    ]);

    res.json({
      success: true,
      message: '订单更新成功'
    });
  } catch (error) {
    console.error('更新订单失败:', error);
    res.status(500).json({
      success: false,
      error: '更新订单失败',
      message: error.message
    });
  }
});

// 删除订单
router.delete('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;

    // 检查订单是否存在
    const existingOrder = await database.get('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 删除订单（级联删除订单项目）
    await database.run('DELETE FROM orders WHERE id = ?', [orderId]);

    res.json({
      success: true,
      message: '订单删除成功'
    });
  } catch (error) {
    console.error('删除订单失败:', error);
    res.status(500).json({
      success: false,
      error: '删除订单失败',
      message: error.message
    });
  }
});

module.exports = router;