const database = require('./models/database');

async function fixPaymentStatus() {
  try {
    console.log('修复付款状态问题...\n');

    // 设置数据库路径
    process.env.DB_PATH = './database.db';
    await database.connect();

    // 1. 检查是否有金额已付清但状态不正确的订单
    const questionableOrders = await database.all(`
      SELECT * FROM orders
      WHERE paid_amount >= total_amount AND total_amount > 0 AND payment_status != '已支付'
    `);

    if (questionableOrders.length > 0) {
      console.log(`发现${questionableOrders.length}个需要修复的订单:`);

      await database.beginTransaction();

      for (const order of questionableOrders) {
        console.log(`  修复订单${order.id}: ${order.customer_name}`);
        console.log(`    总额: ¥${order.total_amount}, 已付: ¥${order.paid_amount}`);
        console.log(`    当前状态: ${order.payment_status} -> 已支付`);

        await database.run(`
          UPDATE orders
          SET payment_status = '已支付', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [order.id]);

        console.log(`    ✅ 修复完成\n`);
      }

      await database.commit();
      console.log('💾 所有订单修复完成！');
    } else {
      console.log('✅ 没有需要修复的订单');
    }

    // 2. 如果您想手动设置某个订单为已支付状态
    console.log('\n🔧 手动修复选项:');
    console.log('如果您想将特定的订单设置为已支付，可以使用以下SQL:');
    console.log("UPDATE orders SET payment_status = '已支付', paid_amount = total_amount WHERE id = [订单号];");

    // 3. 显示当前所有订单的状态
    console.log('\n📋 当前订单状态:');
    const allOrders = await database.all(`
      SELECT id, customer_name, total_amount, paid_amount, payment_status, delivery_date
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5
    `);

    allOrders.forEach(order => {
      const frontendStatus = order.payment_status === '未支付' ? 'unpaid' :
                           order.payment_status === '部分支付' ? 'partial' : 'paid';
      const displayText = frontendStatus === 'paid' ? '已付清' :
                         frontendStatus === 'partial' ? '部分付款' : '未付款';

      console.log(`  订单${order.id}: ${order.customer_name}`);
      console.log(`    制作日期: ${order.delivery_date}`);
      console.log(`    总额: ¥${order.total_amount}, 已付: ¥${order.paid_amount}`);
      console.log(`    显示: ${displayText} (${frontendStatus})`);
      console.log('');
    });

    console.log('💡 建议:');
    console.log('1. 如果您想将2026年的订单设为已支付，请告诉我订单号');
    console.log('2. 或者在前端订单编辑功能中添加付款状态设置');
    console.log('3. 前端显示逻辑已经正确，只是需要正确的数据');

  } catch (error) {
    await database.rollback();
    console.error('修复失败:', error);
  } finally {
    process.exit(0);
  }
}

fixPaymentStatus();