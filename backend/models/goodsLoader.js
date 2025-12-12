const fs = require('fs');
const path = require('path');


class GoodsLoader {
  constructor() {
    this.goodsData = null;
    this.filePath = path.join(__dirname, '../resources/goods.json');
  }

  /**
   * 加载商品数据
   */
  load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        console.error(`商品文件不存在: ${this.filePath}`);
        return null;
      }

      const fileContent = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(fileContent);
      this.goodsData = data.goods || {};
      const categoryCount = Object.keys(this.goodsData).length;
      console.log(`✅ 商品数据加载成功，共 ${categoryCount} 个分类`);
      return this.goodsData;
    } catch (error) {
      console.error('加载商品数据失败:', error.message);
      return null;
    }
  }

  /**
   * 获取商品树形结构
   */
  getGoodsTree() {
    if (!this.goodsData) {
      this.load();
    }

    const tree = {};

    Object.keys(this.goodsData).forEach(categoryName => {
      const categoryContent = this.goodsData[categoryName];

      if (!tree[categoryName]) {
        tree[categoryName] = {};
      }

      Object.keys(categoryContent).forEach(subcategoryName => {
        const products = categoryContent[subcategoryName];

        if (!tree[categoryName][subcategoryName]) {
          tree[categoryName][subcategoryName] = [];
        }

        // 处理产品数据 - 第三层是产品分类，第四层是具体商品
        Object.keys(products).forEach(productCategoryName => {
          const productItems = products[productCategoryName];

          if (typeof productItems === 'object' && productItems !== null) {
            Object.keys(productItems).forEach(productName => {
              const productPrice = productItems[productName];
              const product = {
                name: productName,
                price: productPrice,
                category: productCategoryName // 保留第三层分类信息
              };
              tree[categoryName][subcategoryName].push(product);
            });
          }
        });
      });
    });

    return tree;
  }

  /**
   * 获取平铺的商品列表
   */
  getFlatList() {
    if (!this.goodsData) {
      this.load();
    }

    const flatList = [];
    let id = 1;

    Object.keys(this.goodsData).forEach(categoryName => {
      const categoryContent = this.goodsData[categoryName];

      Object.keys(categoryContent).forEach(subcategoryName => {
        const products = categoryContent[subcategoryName];

        // 处理第四层的具体商品
        Object.keys(products).forEach(productCategoryName => {
          const productItems = products[productCategoryName];

          if (typeof productItems === 'object' && productItems !== null) {
            Object.keys(productItems).forEach(productName => {
              const productPrice = productItems[productName];
              flatList.push({
                id: id++,
                category: categoryName,
                subcategory: subcategoryName,
                product_category: productCategoryName, // 第三层分类
                product_name: productName, // 第四层商品名
                price: productPrice,
                unit: productName.includes('个') ? '个' : '套' // 根据商品名判断单位
              });
            });
          }
        });
      });
    });

    return flatList;
  }

  /**
   * 获取所有分类
   */
  getCategories() {
    if (!this.goodsData) {
      this.load();
    }

    return Object.keys(this.goodsData);
  }

  /**
   * 获取指定分类下的子分类
   */
  getSubcategories(category) {
    if (!this.goodsData) {
      this.load();
    }

    const categoryContent = this.goodsData[category];
    if (!categoryContent) {
      return [];
    }

    return Object.keys(categoryContent);
  }

  /**
   * 获取指定子分类下的商品
   */
  getProducts(category, subcategory) {
    if (!this.goodsData) {
      this.load();
    }

    const categoryContent = this.goodsData[category];
    if (!categoryContent) {
      return [];
    }

    const products = categoryContent[subcategory];
    if (!products) {
      return [];
    }

    const result = [];

    // 处理第四层的具体商品
    Object.keys(products).forEach(productCategoryName => {
      const productItems = products[productCategoryName];

      if (typeof productItems === 'object' && productItems !== null) {
        Object.keys(productItems).forEach(productName => {
          const productPrice = productItems[productName];
          result.push({
            name: productName,
            price: productPrice,
            category: productCategoryName,
            unit: productName.includes('个') ? '个' : '套'
          });
        });
      }
    });

    return result;
  }

  /**
   * 保存商品数据到文件
   */
  saveGoodsData(newGoodsData) {
    try {
      // newGoodsData 应该是对象格式 {"花馍": {...}, "果蔬": {...}}
      const data = { goods: newGoodsData };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
      this.goodsData = data.goods;
      console.log('✅ 商品数据保存成功');
      return true;
    } catch (error) {
      console.error('保存商品数据失败:', error.message);
      return false;
    }
  }

  /**
   * 搜索商品
   */
  searchProducts(keyword) {
    if (!this.goodsData) {
      this.load();
    }

    const results = [];
    const lowerKeyword = keyword.toLowerCase();

    Object.keys(this.goodsData).forEach(categoryName => {
      const categoryContent = this.goodsData[categoryName];

      Object.keys(categoryContent).forEach(subcategoryName => {
        const products = categoryContent[subcategoryName];

        // 处理第四层的具体商品
        Object.keys(products).forEach(productCategoryName => {
          const productItems = products[productCategoryName];

          if (typeof productItems === 'object' && productItems !== null) {
            Object.keys(productItems).forEach(productName => {
              const productPrice = productItems[productName];

              // 检查名称或分类是否匹配
              if (
                productName.toLowerCase().includes(lowerKeyword) ||
                productCategoryName.toLowerCase().includes(lowerKeyword) ||
                subcategoryName.toLowerCase().includes(lowerKeyword) ||
                categoryName.toLowerCase().includes(lowerKeyword)
              ) {
                results.push({
                  name: productName,
                  price: productPrice,
                  category: categoryName,
                  subcategory: subcategoryName,
                  product_category: productCategoryName,
                  unit: productName.includes('个') ? '个' : '套'
                });
              }
            });
          }
        });
      });
    });

    return results;
  }
}

// 创建单例
const goodsLoader = new GoodsLoader();

module.exports = goodsLoader;