const express = require('express');
const router = express.Router();
const database = require('../models/database');

// 获取商品目录（树形结构）
router.get('/', async (req, res) => {
  try {
    const goods = await database.all(`
      SELECT
        category,
        subcategory,
        product_name,
        price,
        unit,
        description,
        is_available,
        sort_order
      FROM goods
      WHERE is_available = 1
      ORDER BY category, subcategory, sort_order, product_name
    `);

    // 构建树形结构
    const tree = {};
    goods.forEach(item => {
      if (!tree[item.category]) {
        tree[item.category] = {};
      }

      if (!tree[item.category][item.subcategory]) {
        tree[item.category][item.subcategory] = {
          name: item.subcategory,
          products: []
        };
      }

      tree[item.category][item.subcategory].products.push({
        name: item.product_name,
        price: item.price,
        unit: item.unit,
        description: item.description
      });
    });

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('获取商品目录失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品目录失败',
      message: error.message
    });
  }
});

// 获取平铺的商品列表
router.get('/flat', async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    let sql = `
      SELECT
        id,
        category,
        subcategory,
        product_name,
        price,
        unit,
        description,
        is_available,
        sort_order
      FROM goods
      WHERE is_available = 1
    `;
    const params = [];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    if (subcategory) {
      sql += ` AND subcategory = ?`;
      params.push(subcategory);
    }

    sql += ` ORDER BY category, subcategory, sort_order, product_name`;

    const goods = await database.all(sql, params);

    res.json({
      success: true,
      data: goods
    });
  } catch (error) {
    console.error('获取商品列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品列表失败',
      message: error.message
    });
  }
});

// 获取商品分类
router.get('/categories', async (req, res) => {
  try {
    const categories = await database.all(`
      SELECT DISTINCT category
      FROM goods
      WHERE is_available = 1
      ORDER BY category
    `);

    res.json({
      success: true,
      data: categories.map(c => c.category)
    });
  } catch (error) {
    console.error('获取商品分类失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品分类失败',
      message: error.message
    });
  }
});

// 获取指定分类下的子分类
router.get('/subcategories/:category', async (req, res) => {
  try {
    const category = req.params.category;

    const subcategories = await database.all(`
      SELECT DISTINCT subcategory
      FROM goods
      WHERE category = ? AND is_available = 1
      ORDER BY subcategory
    `, [category]);

    res.json({
      success: true,
      data: subcategories.map(s => s.subcategory)
    });
  } catch (error) {
    console.error('获取子分类失败:', error);
    res.status(500).json({
      success: false,
      error: '获取子分类失败',
      message: error.message
    });
  }
});

// 获取指定子分类下的商品
router.get('/products/:category/:subcategory', async (req, res) => {
  try {
    const { category, subcategory } = req.params;

    const products = await database.all(`
      SELECT
        id,
        product_name,
        price,
        unit,
        description,
        sort_order
      FROM goods
      WHERE category = ? AND subcategory = ? AND is_available = 1
      ORDER BY sort_order, product_name
    `, [category, subcategory]);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('获取商品列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品列表失败',
      message: error.message
    });
  }
});

// 搜索商品
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      });
    }

    const goods = await database.all(`
      SELECT
        id,
        category,
        subcategory,
        product_name,
        price,
        unit,
        description
      FROM goods
      WHERE is_available = 1
        AND (
          product_name LIKE ?
          OR description LIKE ?
          OR category LIKE ?
          OR subcategory LIKE ?
        )
      ORDER BY category, subcategory, product_name
    `, [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);

    res.json({
      success: true,
      data: goods,
      count: goods.length
    });
  } catch (error) {
    console.error('搜索商品失败:', error);
    res.status(500).json({
      success: false,
      error: '搜索商品失败',
      message: error.message
    });
  }
});

// 添加新商品（管理员功能）
router.post('/', async (req, res) => {
  try {
    const {
      category,
      subcategory,
      product_name,
      price,
      unit,
      description
    } = req.body;

    // 验证必填字段
    if (!category || !subcategory || !product_name || !price) {
      return res.status(400).json({
        success: false,
        error: '请填写完整的商品信息'
      });
    }

    // 检查商品是否已存在
    const existing = await database.get(`
      SELECT id FROM goods
      WHERE category = ? AND subcategory = ? AND product_name = ?
    `, [category, subcategory, product_name]);

    if (existing) {
      return res.status(409).json({
        success: false,
        error: '商品已存在'
      });
    }

    // 获取当前最大排序值
    const maxSort = await database.get(`
      SELECT COALESCE(MAX(sort_order), 0) as max_sort
      FROM goods
      WHERE category = ? AND subcategory = ?
    `, [category, subcategory]);

    // 插入新商品
    const result = await database.run(`
      INSERT INTO goods (
        category, subcategory, product_name, price,
        unit, description, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      category,
      subcategory,
      product_name,
      parseFloat(price),
      unit || '个',
      description || '',
      maxSort.max_sort + 1
    ]);

    res.status(201).json({
      success: true,
      message: '商品添加成功',
      data: {
        id: result.id
      }
    });
  } catch (error) {
    console.error('添加商品失败:', error);
    res.status(500).json({
      success: false,
      error: '添加商品失败',
      message: error.message
    });
  }
});

// 更新商品信息（管理员功能）
router.put('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      category,
      subcategory,
      product_name,
      price,
      unit,
      description,
      is_available
    } = req.body;

    // 检查商品是否存在
    const existing = await database.get('SELECT id FROM goods WHERE id = ?', [productId]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '商品不存在'
      });
    }

    // 更新商品信息
    await database.run(`
      UPDATE goods SET
        category = COALESCE(?, category),
        subcategory = COALESCE(?, subcategory),
        product_name = COALESCE(?, product_name),
        price = COALESCE(?, price),
        unit = COALESCE(?, unit),
        description = COALESCE(?, description),
        is_available = COALESCE(?, is_available),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      category,
      subcategory,
      product_name,
      price ? parseFloat(price) : undefined,
      unit,
      description,
      is_available !== undefined ? (is_available ? 1 : 0) : undefined,
      productId
    ]);

    res.json({
      success: true,
      message: '商品更新成功'
    });
  } catch (error) {
    console.error('更新商品失败:', error);
    res.status(500).json({
      success: false,
      error: '更新商品失败',
      message: error.message
    });
  }
});

// 删除商品（管理员功能）
router.delete('/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    // 检查商品是否存在
    const existing = await database.get('SELECT id FROM goods WHERE id = ?', [productId]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '商品不存在'
      });
    }

    // 软删除（设为不可用）
    await database.run(`
      UPDATE goods SET
        is_available = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [productId]);

    res.json({
      success: true,
      message: '商品删除成功'
    });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(500).json({
      success: false,
      error: '删除商品失败',
      message: error.message
    });
  }
});

module.exports = router;