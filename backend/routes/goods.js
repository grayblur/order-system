const express = require('express');
const router = express.Router();
const goodsLoader = require('../models/goodsLoader');

// 获取商品目录（树形结构）
router.get('/', (req, res) => {
  try {
    const tree = goodsLoader.getGoodsTree();
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
router.get('/flat', (req, res) => {
  try {
    let goods = goodsLoader.getFlatList();

    const { category, subcategory } = req.query;

    if (category) {
      goods = goods.filter(item => item.category === category);
    }

    if (subcategory) {
      goods = goods.filter(item => item.subcategory === subcategory);
    }

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
router.get('/categories', (req, res) => {
  try {
    const categories = goodsLoader.getCategories();
    res.json({
      success: true,
      data: categories
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
router.get('/subcategories/:category', (req, res) => {
  try {
    const category = req.params.category;
    const subcategories = goodsLoader.getSubcategories(category);

    res.json({
      success: true,
      data: subcategories
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
router.get('/products/:category/:subcategory', (req, res) => {
  try {
    const { category, subcategory } = req.params;
    const products = goodsLoader.getProducts(category, subcategory);

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
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      });
    }

    const goods = goodsLoader.searchProducts(q);

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

// 注：商品数据从 goods.json 文件读取
// POST、PUT、DELETE 接口目前不可用，商品数据应直接修改 config/goods.json 文件
router.post('/', (req, res) => {
  res.status(503).json({
    success: false,
    error: '商品添加已禁用',
    message: '请直接编辑 backend/resources/goods.json 文件来修改商品数据'
  });
});

router.put('/:id', (req, res) => {
  res.status(503).json({
    success: false,
    error: '商品更新已禁用',
    message: '请直接编辑 backend/resources/goods.json 文件来修改商品数据'
  });
});

router.delete('/:id', (req, res) => {
  res.status(503).json({
    success: false,
    error: '商品删除已禁用',
    message: '请直接编辑 backend/resources/goods.json 文件来修改商品数据'
  });
});

module.exports = router;