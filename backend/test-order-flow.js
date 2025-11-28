const database = require('./models/database');

async function testOrderFlow() {
  try {
    console.log('测试订单数据流...\n');

    // 设置数据库路径
    process.env.DB_PATH = './database.db';
    await database.connect();

    // 1. 从数据库获取已支付订单
    const paidOrder = await database.get(`
      SELECT * FROM orders WHERE payment_status = '已支付' LIMIT 1
    `);

    if (!paidOrder) {
      console.log('❌ 没有找到已支付订单');
      return;
    }

    console.log('✅ 找到已支付订单:');
    console.log(`  ID: ${paidOrder.id}`);
    console.log(`  客户: ${paidOrder.customer_name}`);
    console.log(`  总额: ¥${paidOrder.total_amount}`);
    console.log(`  已付: ¥${paidOrder.paid_amount}`);
    console.log(`  支付状态: ${paidOrder.payment_status}\n`);

    // 2. 模拟API返回（基于routes/orders.js的逻辑）
    const apiResponse = {
      success: true,
      data: [paidOrder]
    };

    console.log('📡 API返回数据:');
    console.log(JSON.stringify(apiResponse, null, 2));
    console.log();

    // 3. 模拟前端映射（基于OrderList.vue的逻辑）
    const frontendOrder = {
      id: paidOrder.id,
      customerInfo: {
        name: paidOrder.customer_name,
        phone: paidOrder.customer_phone,
        address: paidOrder.customer_address,
        deliveryDate: paidOrder.delivery_date,
        notes: paidOrder.notes
      },
      items: [],
      totalAmount: paidOrder.total_amount,
      paidAmount: paidOrder.paid_amount,
      paymentStatus: paidOrder.payment_status === '未支付' ? 'unpaid' :
                       paidOrder.payment_status === '部分支付' ? 'partial' : 'paid',
      createdAt: paidOrder.created_at,
      orderStatus: paidOrder.order_status,
      itemCount: 1
    };

    console.log('🔄 前端映射后数据:');
    console.log(`  paymentStatus: ${frontendOrder.paymentStatus}`);
    console.log(`  totalAmount: ${frontendOrder.totalAmount}`);
    console.log(`  paidAmount: ${frontendOrder.paidAmount}\n`);

    // 4. 模拟前端显示逻辑
    const displayText = frontendOrder.paymentStatus === 'paid' ? '已付清' :
                       frontendOrder.paymentStatus === 'partial' ? '部分付款' : '未付款';

    const displayType = frontendOrder.paymentStatus === 'paid' ? 'success' :
                      frontendOrder.paymentStatus === 'partial' ? 'warning' : 'danger';

    console.log('🎨 前端显示结果:');
    console.log(`  显示文本: ${displayText}`);
    console.log(`  标签类型: ${displayType}`);

    // 5. 测试实际的API调用
    console.log('\n🌐 测试实际API调用:');
    const response = await fetch('http://localhost:3000/api/orders');
    const result = await response.json();

    const apiPaidOrders = result.data.filter(order => order.payment_status === '已支付');
    console.log(`API中的已支付订单数量: ${apiPaidOrders.length}`);

    if (apiPaidOrders.length > 0) {
      const sample = apiPaidOrders[0];
      const frontendMapping = sample.payment_status === '未支付' ? 'unpaid' :
                             sample.payment_status === '部分支付' ? 'partial' : 'paid';
      const frontendText = frontendMapping === 'paid' ? '已付清' :
                         frontendMapping === 'partial' ? '部分付款' : '未付款';

      console.log(`示例订单映射结果: ${sample.customer_name} -> ${frontendText}`);
    }

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    process.exit(0);
  }
}

testOrderFlow();