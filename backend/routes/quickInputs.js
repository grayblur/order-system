const express = require('express');
const router = express.Router();
const database = require('../models/database');

// 获取所有快捷输入
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let sql = `
      SELECT
        id,
        content,
        type,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM quick_inputs
      WHERE is_active = 1
    `;
    const params = [];

    // 按类型筛选
    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY sort_order ASC, created_at DESC`;

    const quickInputs = await database.all(sql, params);

    res.json({
      success: true,
      data: quickInputs
    });
  } catch (error) {
    console.error('获取快捷输入失败:', error);
    res.status(500).json({
      success: false,
      error: '获取快捷输入失败',
      message: error.message
    });
  }
});

// 创建新的快捷输入
router.post('/', async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;

    // 验证必填字段
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '快捷输入内容不能为空'
      });
    }

    // 检查是否已存在相同内容
    const existing = await database.get(`
      SELECT id FROM quick_inputs
      WHERE content = ? AND is_active = 1
    `, [content.trim()]);

    if (existing) {
      return res.status(400).json({
        success: false,
        error: '该快捷输入已存在'
      });
    }

    // 获取当前最大的排序值
    const maxSortResult = await database.get(`
      SELECT MAX(sort_order) as max_sort FROM quick_inputs WHERE is_active = 1
    `);
    const nextSort = (maxSortResult.max_sort || 0) + 1;

    // 插入新的快捷输入
    const result = await database.run(`
      INSERT INTO quick_inputs (content, type, is_active, sort_order)
      VALUES (?, ?, 1, ?)
    `, [content.trim(), type, nextSort]);

    res.status(201).json({
      success: true,
      message: '快捷输入创建成功',
      data: {
        id: result.id,
        content: content.trim(),
        type,
        sort_order: nextSort
      }
    });
  } catch (error) {
    console.error('创建快捷输入失败:', error);
    res.status(500).json({
      success: false,
      error: '创建快捷输入失败',
      message: error.message
    });
  }
});

// 更新快捷输入
router.put('/:id', async (req, res) => {
  try {
    const { content, type } = req.body;
    const quickInputId = req.params.id;

    // 检查快捷输入是否存在
    const existing = await database.get(`
      SELECT id FROM quick_inputs WHERE id = ? AND is_active = 1
    `, [quickInputId]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '快捷输入不存在'
      });
    }

    // 验证必填字段
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '快捷输入内容不能为空'
      });
    }

    // 检查是否与其他快捷输入重复
    const duplicate = await database.get(`
      SELECT id FROM quick_inputs
      WHERE content = ? AND id != ? AND is_active = 1
    `, [content.trim(), quickInputId]);

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: '该快捷输入已存在'
      });
    }

    // 更新快捷输入
    await database.run(`
      UPDATE quick_inputs
      SET content = ?, type = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [content.trim(), type || 'text', quickInputId]);

    res.json({
      success: true,
      message: '快捷输入更新成功'
    });
  } catch (error) {
    console.error('更新快捷输入失败:', error);
    res.status(500).json({
      success: false,
      error: '更新快捷输入失败',
      message: error.message
    });
  }
});

// 删除快捷输入（软删除）
router.delete('/:id', async (req, res) => {
  try {
    const quickInputId = req.params.id;

    // 检查快捷输入是否存在
    const existing = await database.get(`
      SELECT id FROM quick_inputs WHERE id = ? AND is_active = 1
    `, [quickInputId]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '快捷输入不存在'
      });
    }

    // 软删除快捷输入
    await database.run(`
      UPDATE quick_inputs
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [quickInputId]);

    res.json({
      success: true,
      message: '快捷输入删除成功'
    });
  } catch (error) {
    console.error('删除快捷输入失败:', error);
    res.status(500).json({
      success: false,
      error: '删除快捷输入失败',
      message: error.message
    });
  }
});

// 重新排序快捷输入
router.put('/reorder', async (req, res) => {
  try {
    const { items } = req.body; // items should be an array of { id, sort_order }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的排序数据'
      });
    }

    // 开始事务
    await database.beginTransaction();

    try {
      // 更新每个项目的排序
      for (const item of items) {
        await database.run(`
          UPDATE quick_inputs
          SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND is_active = 1
        `, [item.sort_order, item.id]);
      }

      // 提交事务
      await database.commit();

      res.json({
        success: true,
        message: '快捷输入排序更新成功'
      });
    } catch (error) {
      // 回滚事务
      await database.rollback();
      throw error;
    }
  } catch (error) {
    console.error('重新排序快捷输入失败:', error);
    res.status(500).json({
      success: false,
      error: '重新排序快捷输入失败',
      message: error.message
    });
  }
});

module.exports = router;