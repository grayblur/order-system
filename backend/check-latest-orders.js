const database = require('./models/database');

async function checkLatestOrders() {
  try {
    console.log('检查最新的订单数据...\n');

    // 设置数据库路径
    process.env.DB_PATH = './database.db';
    await database.connect();

    // 获取最近5分钟内的订单
    const recentOrders = await database.all(`
      SELECT * FROM orders
      WHERE created_at >= datetime('now', '-5 minutes')
      ORDER BY created_at DESC
    `);

    console.log(`🕒 最近5分钟内的订单: ${recentOrders.length}个`);
    recentOrders.forEach(order => {
      const frontendStatus = order.payment_status === '未支付' ? 'unpaid' :
                           order.payment_status === '部分支付' ? 'partial' : 'paid';
      const displayText = frontendStatus === 'paid' ? '已付清' :
                         frontendStatus === 'partial' ? '部分付款' : '未付款';

      console.log(`  订单${order.id}: ${order.customer_name}`);
      console.log(`    总额: ¥${order.total_amount}, 已付: ¥${order.paid_amount}`);
      console.log(`    数据库状态: ${order.payment_status}`);
      console.log(`    前端映射: ${frontendStatus}`);
      console.log(`    显示文本: ${displayText}`);
      console.log('');
    });

    // 获取所有已支付订单
    const paidOrders = await database.all(`
      SELECT * FROM orders
      WHERE payment_status = '已支付'
      ORDER BY created_at DESC
    `);

    console.log(`✅ 数据库中"已支付"订单总数: ${paidOrders.length}个`);
    if (paidOrders.length > 0) {
      paidOrders.forEach(order => {
        console.log(`  订单${order.id}: ${order.customer_name}, ¥${order.total_amount}, 创建时间: ${order.created_at}`);
      });
    }

    // 检查是否有用户创建的订单但状态不正确
    console.log('\n🔍 检查可能的问题订单:');
    const questionableOrders = await database.all(`
      SELECT * FROM orders
      WHERE paid_amount >= total_amount AND payment_status != '已支付'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (questionableOrders.length > 0) {
      console.log(`发现${questionableOrders.length}个金额已付清但状态不正确的订单:`);
      questionableOrders.forEach(order => {
        console.log(`  订单${order.id}: ${order.customer_name}`);
        console.log(`    总额: ¥${order.total_amount}, 已付: ¥${order.paid_amount}`);
        console.log(`    当前状态: ${order.payment_status}, 应该状态: 已支付`);
        console.log('');
      });
    } else {
      console.log('✅ 没有发现金额与状态不匹配的订单');
    }

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    process.exit(0);
  }
}

checkLatestOrders();