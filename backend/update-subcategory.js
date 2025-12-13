const Database = require('better-sqlite3');
const path = require('path');

// 连接数据库
const dbPath = process.env.DB_PATH || path.join(__dirname, '../database.db');
const db = new Database(dbPath);

console.log('开始更新订单项的二级分类信息...');

try {
  // 获取所有缺少 subcategory 的订单项
  const itemsWithoutSubcategory = db.prepare(`
    SELECT id, category, product_category, product_name
    FROM order_items
    WHERE subcategory IS NULL OR subcategory = ''
  `).all();

  console.log(`找到 ${itemsWithoutSubcategory.length} 个需要更新的订单项`);

  // 根据商品名称推断二级分类
  const updateSubcategory = db.prepare(`
    UPDATE order_items
    SET subcategory = ?
    WHERE id = ?
  `);

  let updatedCount = 0;

  itemsWithoutSubcategory.forEach(item => {
    let subcategory = '';

    // 根据商品分类推断二级分类
    if (item.category === '花馍' || item.category === '枣糕') {
      if (item.product_category === '上头糕' || item.product_category === '剃头糕' ||
          item.product_category === '上头馍' || item.product_category === '馄饨馍' ||
          item.product_category === '双石榴') {
        subcategory = '结婚';
      } else if (item.product_category === '小花' || item.product_category === '大花' ||
                 item.product_category === '馄饨花馍' || item.product_category === '大龙凤' ||
                 item.product_category === '滚路糕') {
        subcategory = '订婚';
      } else if (item.product_category === '12岁小花' || item.product_category === '12岁大花' ||
                 item.product_category === '1岁小花小圈') {
        subcategory = '生日';
      } else if (item.product_category === '1岁小花') {
        subcategory = '生日';
      } else {
        subcategory = '其他';
      }
    } else if (item.category === '果蔬') {
      subcategory = '其他';
    } else {
      subcategory = '其他';
    }

    // 执行更新
    const result = updateSubcategory.run(subcategory, item.id);
    if (result.changes > 0) {
      updatedCount++;
      console.log(`✅ 更新订单项 ${item.id}: ${item.category} -> ${subcategory} - ${item.product_category}`);
    }
  });

  console.log(`\n🎉 完成！共更新了 ${updatedCount} 个订单项的二级分类信息`);

  // 验证更新结果
  const remainingEmpty = db.prepare(`
    SELECT COUNT(*) as count
    FROM order_items
    WHERE subcategory IS NULL OR subcategory = ''
  `).get();

  console.log(`📊 剩余未更新的订单项: ${remainingEmpty.count} 个`);

} catch (error) {
  console.error('❌ 更新过程中出错:', error.message);
} finally {
  db.close();
  console.log('数据库连接已关闭');
}