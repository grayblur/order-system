const database = require('./models/database');

async function testFrontendLoading() {
  try {
    console.log('测试前端订单加载情况...\n');

    // 设置数据库路径
    process.env.DB_PATH = './database.db';
    await database.connect();

    // 1. 检查数据库中的支付状态分布
    const statusCounts = await database.all(`
      SELECT payment_status, COUNT(*) as count, SUM(total_amount) as total_amount
      FROM orders
      GROUP BY payment_status
    `);

    console.log('📊 数据库中的支付状态分布:');
    statusCounts.forEach(row => {
      console.log(`  ${row.payment_status}: ${row.count}个订单, 总金额: ¥${row.total_amount}`);
    });

    // 2. 测试API端点
    console.log('\n🌐 测试API端点:');
    const response = await fetch('http://localhost:3000/api/orders');

    if (!response.ok) {
      console.log(`❌ API调用失败: ${response.status} ${response.statusText}`);
      return;
    }

    const apiResult = await response.json();
    if (!apiResult.success) {
      console.log(`❌ API返回失败: ${apiResult.error}`);
      return;
    }

    console.log(`✅ API返回成功，共${apiResult.data.length}个订单`);

    // 3. 分析API返回的数据
    const apiStatusCounts = {};
    apiResult.data.forEach(order => {
      apiStatusCounts[order.payment_status] = (apiStatusCounts[order.payment_status] || 0) + 1;
    });

    console.log('📋 API返回的支付状态分布:');
    Object.entries(apiStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}个订单`);
    });

    // 4. 模拟前端映射逻辑
    console.log('\n🔄 前端映射结果:');
    const frontendOrders = apiResult.data.map(order => {
      return {
        id: order.id,
        customerName: order.customer_name,
        totalAmount: order.total_amount,
        paidAmount: order.paid_amount,
        dbPaymentStatus: order.payment_status,
        frontendPaymentStatus: order.payment_status === '未支付' ? 'unpaid' :
                               order.payment_status === '部分支付' ? 'partial' : 'paid'
      };
    });

    const frontendStatusCounts = {};
    frontendOrders.forEach(order => {
      frontendStatusCounts[order.frontendPaymentStatus] = (frontendStatusCounts[order.frontendPaymentStatus] || 0) + 1;
      console.log(`  订单${order.id}: ${order.customerName} - ${order.dbPaymentStatus} -> ${order.frontendPaymentStatus}`);
    });

    console.log('\n🎨 前端最终显示状态分布:');
    Object.entries(frontendStatusCounts).forEach(([status, count]) => {
      const displayText = status === 'paid' ? '已付清' :
                        status === 'partial' ? '部分付款' : '未付款';
      console.log(`  ${status} (${displayText}): ${count}个订单`);
    });

    // 5. 检查"已付清"订单的详细信息
    const paidOrders = frontendOrders.filter(order => order.frontendPaymentStatus === 'paid');
    console.log(`\n✅ 应该显示为"已付清"的订单数量: ${paidOrders.length}`);

    paidOrders.forEach(order => {
      console.log(`  订单${order.id}: ${order.customerName}, 总额¥${order.totalAmount}, 已付¥${order.paidAmount}`);
    });

    // 6. 验证过滤逻辑
    console.log('\n🔍 验证前端过滤逻辑:');
    console.log('默认过滤器设置 (空字符串) - 应该显示所有订单');
    console.log('如果设置了状态过滤器，可能会影响显示结果');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    process.exit(0);
  }
}

testFrontendLoading();