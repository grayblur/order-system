const database = require('./models/database');

async function fixOrder13() {
  try {
    console.log('修复订单13的付款状态...\n');

    // 设置数据库路径
    process.env.DB_PATH = './database.db';
    await database.connect();

    // 获取订单13的当前信息
    const order = await database.get(`
      SELECT * FROM orders WHERE id = 13
    `);

    if (!order) {
      console.log('❌ 未找到订单13');
      return;
    }

    console.log('📋 订单13当前信息:');
    console.log(`  客户: ${order.customer_name}`);
    console.log(`  配送日期: ${order.delivery_date}`);
    console.log(`  总额: ¥${order.total_amount}`);
    console.log(`  已付: ¥${order.paid_amount}`);
    console.log(`  当前状态: ${order.payment_status}`);

    // 将订单13设置为已支付
    console.log('\n🔧 正在修复订单状态...');
    await database.beginTransaction();

    await database.run(`
      UPDATE orders
      SET
        payment_status = '已支付',
        paid_amount = total_amount,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 13
    `);

    await database.commit();

    // 验证修复结果
    const updatedOrder = await database.get(`
      SELECT * FROM orders WHERE id = 13
    `);

    console.log('\n✅ 修复完成！订单13的新信息:');
    console.log(`  客户: ${updatedOrder.customer_name}`);
    console.log(`  配送日期: ${updatedOrder.delivery_date}`);
    console.log(`  总额: ¥${updatedOrder.total_amount}`);
    console.log(`  已付: ¥${updatedOrder.paid_amount}`);
    console.log(`  新状态: ${updatedOrder.payment_status}`);

    // 模拟前端显示
    const frontendStatus = updatedOrder.payment_status === '未支付' ? 'unpaid' :
                         updatedOrder.payment_status === '部分支付' ? 'partial' : 'paid';
    const displayText = frontendStatus === 'paid' ? '已付清' :
                       frontendStatus === 'partial' ? '部分付款' : '未付款';
    const displayType = frontendStatus === 'paid' ? 'success (绿色)' :
                      frontendStatus === 'partial' ? 'warning (黄色)' : 'danger (红色)';

    console.log('\n🎨 前端将显示为:');
    console.log(`  状态文本: ${displayText}`);
    console.log(`  标签颜色: ${displayType}`);

    console.log('\n💡 提示:');
    console.log('现在请刷新前端页面 http://localhost:5173');
    console.log('您的2026年订单应该显示为绿色"已付清"标签');

  } catch (error) {
    await database.rollback();
    console.error('修复失败:', error);
  } finally {
    process.exit(0);
  }
}

fixOrder13();