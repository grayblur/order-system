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
      this.goodsData = data.goods || [];
      console.log(`✅ 商品数据加载成功，共 ${this.goodsData.length} 个分类`);
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

    this.goodsData.forEach(categoryItem => {
      const categoryName = Object.keys(categoryItem)[0];
      const categoryContent = categoryItem[categoryName];

      if (!tree[categoryName]) {
        tree[categoryName] = {};
      }

      categoryContent.forEach(subcategoryItem => {
        const subcategoryName = Object.keys(subcategoryItem)[0];
        const products = subcategoryItem[subcategoryName];

        if (!tree[categoryName][subcategoryName]) {
          tree[categoryName][subcategoryName] = [];
        }

        // 处理产品数据
        products.forEach(productItem => {
          const productName = Object.keys(productItem)[0];
          const productValue = productItem[productName];

          const product = {
            name: productName
          };

          // 处理不同的价格格式
          if (typeof productValue === 'number') {
            product.price = productValue;
          } else if (Array.isArray(productValue)) {
            // 格式: ["1套", 260] 或类似的
            product.unit = productValue[0];
            product.price = productValue[1] || 0;
          } else if (typeof productValue === 'object') {
            product.unit = productValue.unit || '个';
            product.price = productValue.price || 0;
          }

          tree[categoryName][subcategoryName].push(product);
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

    this.goodsData.forEach(categoryItem => {
      const categoryName = Object.keys(categoryItem)[0];
      const categoryContent = categoryItem[categoryName];

      categoryContent.forEach(subcategoryItem => {
        const subcategoryName = Object.keys(subcategoryItem)[0];
        const products = subcategoryItem[subcategoryName];

        products.forEach(productItem => {
          const productName = Object.keys(productItem)[0];
          const productValue = productItem[productName];

          const item = {
            id: id++,
            category: categoryName,
            subcategory: subcategoryName,
            product_name: productName,
            unit: '个'
          };

          // 处理价格和单位
          if (typeof productValue === 'number') {
            item.price = productValue;
          } else if (Array.isArray(productValue)) {
            item.unit = productValue[0];
            item.price = productValue[1] || 0;
          } else if (typeof productValue === 'object') {
            item.unit = productValue.unit || '个';
            item.price = productValue.price || 0;
          }

          flatList.push(item);
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

    return this.goodsData.map(item => Object.keys(item)[0]);
  }

  /**
   * 获取指定分类下的子分类
   */
  getSubcategories(category) {
    if (!this.goodsData) {
      this.load();
    }

    const categoryItem = this.goodsData.find(item => Object.keys(item)[0] === category);
    if (!categoryItem) {
      return [];
    }

    const categoryContent = categoryItem[category];
    return categoryContent.map(item => Object.keys(item)[0]);
  }

  /**
   * 获取指定子分类下的商品
   */
  getProducts(category, subcategory) {
    if (!this.goodsData) {
      this.load();
    }

    const categoryItem = this.goodsData.find(item => Object.keys(item)[0] === category);
    if (!categoryItem) {
      return [];
    }

    const categoryContent = categoryItem[category];
    const subcategoryItem = categoryContent.find(item => Object.keys(item)[0] === subcategory);
    if (!subcategoryItem) {
      return [];
    }

    const products = subcategoryItem[subcategory];
    return products.map(productItem => {
      const productName = Object.keys(productItem)[0];
      const productValue = productItem[productName];

      const product = {
        name: productName
      };

      if (typeof productValue === 'number') {
        product.price = productValue;
        product.unit = '个';
      } else if (Array.isArray(productValue)) {
        product.unit = productValue[0];
        product.price = productValue[1] || 0;
      } else if (typeof productValue === 'object') {
        product.unit = productValue.unit || '个';
        product.price = productValue.price || 0;
      }

      return product;
    });
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

    this.goodsData.forEach(categoryItem => {
      const categoryName = Object.keys(categoryItem)[0];
      const categoryContent = categoryItem[categoryName];

      categoryContent.forEach(subcategoryItem => {
        const subcategoryName = Object.keys(subcategoryItem)[0];
        const products = subcategoryItem[subcategoryName];

        products.forEach(productItem => {
          const productName = Object.keys(productItem)[0];
          const productValue = productItem[productName];

          // 检查名称或分类是否匹配
          if (
            productName.toLowerCase().includes(lowerKeyword) ||
            categoryName.toLowerCase().includes(lowerKeyword) ||
            subcategoryName.toLowerCase().includes(lowerKeyword)
          ) {
            const product = {
              name: productName,
              category: categoryName,
              subcategory: subcategoryName
            };

            if (typeof productValue === 'number') {
              product.price = productValue;
              product.unit = '个';
            } else if (Array.isArray(productValue)) {
              product.unit = productValue[0];
              product.price = productValue[1] || 0;
            } else if (typeof productValue === 'object') {
              product.unit = productValue.unit || '个';
              product.price = productValue.price || 0;
            }

            results.push(product);
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
