const database = require('./models/database');

async function createTestOrders() {
  try {
    console.log('创建不同付款状态的测试订单...\n');

    // 设置数据库路径
    process.env.DB_PATH = './database.db';

    // 初始化数据库连接
    await database.connect();

    // 测试订单数据
    const testOrders = [
      {
        customer_name: '未付款客户',
        customer_address: '测试地址1',
        customer_phone: '13800000001',
        delivery_date: '2025-12-01',
        notes: '完全未付款的订单',
        total_amount: 300,
        paid_amount: 0,
        payment_status: '未支付',
        order_status: '待确认',
        items: [
          {
            category: '花馍',
            subcategory: '结婚',
            product_name: '上头糕',
            quantity: 1,
            unit_price: 300,
            total_price: 300
          }
        ]
      },
      {
        customer_name: '部分付款客户',
        customer_address: '测试地址2',
        customer_phone: '13800000002',
        delivery_date: '2025-12-02',
        notes: '部分付款的订单',
        total_amount: 500,
        paid_amount: 200,
        payment_status: '部分支付',
        order_status: '待确认',
        items: [
          {
            category: '花馍',
            subcategory: '订婚',
            product_name: '剃头糕',
            quantity: 2,
            unit_price: 250,
            total_price: 500
          }
        ]
      },
      {
        customer_name: '已付款客户',
        customer_address: '测试地址3',
        customer_phone: '13800000003',
        delivery_date: '2025-12-03',
        notes: '完全付款的订单',
        total_amount: 400,
        paid_amount: 400,
        payment_status: '已支付',
        order_status: '待确认',
        items: [
          {
            category: '花馍',
            subcategory: '生日',
            product_name: '生日糕',
            quantity: 1,
            unit_price: 400,
            total_price: 400
          }
        ]
      }
    ];

    console.log('开始创建测试订单...\n');

    for (const orderData of testOrders) {
      console.log(`创建订单: ${orderData.customer_name}`);

      // 开始事务
      await database.beginTransaction();

      try {
        // 插入订单
        const orderResult = await database.run(`
          INSERT INTO orders (
            customer_name, customer_address, customer_phone,
            delivery_date, notes, total_amount, paid_amount,
            payment_status, order_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          orderData.customer_name,
          orderData.customer_address,
          orderData.customer_phone,
          orderData.delivery_date,
          orderData.notes,
          orderData.total_amount,
          orderData.paid_amount,
          orderData.payment_status,
          orderData.order_status
        ]);

        const orderId = orderResult.id;

        // 插入订单项目
        for (const item of orderData.items) {
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
            item.total_price
          ]);
        }

        // 提交事务
        await database.commit();

        console.log(`  ✓ 订单 ${orderId} 创建成功`);
        console.log(`    总额: ¥${orderData.total_amount}, 已付: ¥${orderData.paid_amount}`);
        console.log(`    状态: ${orderData.payment_status}\n`);

      } catch (error) {
        await database.rollback();
        console.error(`  ✗ 创建订单失败: ${error.message}`);
      }
    }

    // 验证创建的订单
    console.log('=== 验证创建的测试订单 ===');
    const allOrders = await database.all(`
      SELECT id, customer_name, total_amount, paid_amount, payment_status
      FROM orders
      WHERE customer_name LIKE '%客户%'
      ORDER BY id DESC
      LIMIT 5
    `);

    allOrders.forEach(order => {
      console.log(`订单 ${order.id}: ${order.customer_name}`);
      console.log(`  总额: ¥${order.total_amount}, 已付: ¥${order.paid_amount}`);
      console.log(`  付款状态: ${order.payment_status}`);
      console.log('');
    });

  } catch (error) {
    console.error('创建测试订单失败:', error);
  } finally {
    process.exit(0);
  }
}

createTestOrders();