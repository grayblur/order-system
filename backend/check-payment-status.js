const database = require('./models/database');

async function checkPaymentStatus() {
  try {
    console.log('检查数据库中的付款状态...\n');

    // 设置正确的数据库路径
    process.env.DB_PATH = './database.db';

    // 初始化数据库连接
    await database.connect();

    // 获取所有订单
    const orders = await database.all('SELECT id, customer_name, total_amount, paid_amount, payment_status FROM orders ORDER BY id');

    console.log(`总共找到 ${orders.length} 个订单:\n`);

    orders.forEach(order => {
      const remaining = order.total_amount - order.paid_amount;
      const expectedStatus = remaining <= 0 ? '已支付' :
                            order.paid_amount > 0 ? '部分支付' : '未支付';

      console.log(`订单 ${order.id}:`);
      console.log(`  客户: ${order.customer_name}`);
      console.log(`  总额: ¥${order.total_amount}`);
      console.log(`  已付: ¥${order.paid_amount}`);
      console.log(`  剩余: ¥${remaining}`);
      console.log(`  数据库状态: ${order.payment_status}`);
      console.log(`  预期状态: ${expectedStatus}`);
      console.log(`  状态匹配: ${order.payment_status === expectedStatus ? '✓' : '✗'}`);
      console.log('');
    });

    // 测试API返回的数据
    console.log('\n=== 测试API返回数据 ===');
    const response = await fetch('http://localhost:3000/api/orders');
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      const sampleOrder = result.data[0];
      console.log('API返回的示例订单:');
      console.log('  原始payment_status:', sampleOrder.payment_status);

      // 模拟前端映射逻辑
      const mappedStatus = sampleOrder.payment_status === '未支付' ? 'unpaid' :
                           sampleOrder.payment_status === '部分支付' ? 'partial' : 'paid';
      console.log('  映射后的status:', mappedStatus);

      // 模拟前端显示逻辑
      const displayText = mappedStatus === 'paid' ? '已付清' :
                         mappedStatus === 'partial' ? '部分付款' : '未付款';
      console.log('  显示文本:', displayText);
    }

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    process.exit(0);
  }
}

checkPaymentStatus();