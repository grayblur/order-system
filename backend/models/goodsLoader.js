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

        // 处理产品数据 - 第三层是分类，第四层是具体商品
        products.forEach(productItem => {
          const productCategoryName = Object.keys(productItem)[0];
          const productItems = productItem[productCategoryName];

          // 处理第四层的具体商品
          if (Array.isArray(productItems)) {
            if (productItems.length >= 2 && typeof productItems[0] === 'string') {
              // 格式如 ["1套", 260]
              const productName = productItems[0];
              const productPrice = productItems[1];
              const product = {
                name: productCategoryName + '-'+ productName,
                price: productPrice,
                category: productCategoryName // 保留第三层分类信息
              };
              tree[categoryName][subcategoryName].push(product);
            } else {
              // 格式如 [{"百年好合":398}, {"喜结良缘":398}]
              productItems.forEach(item => {
                if (typeof item === 'object' && !Array.isArray(item)) {
                  Object.keys(item).forEach(productName => {
                    const productPrice = item[productName];
                    const product = {
                      name: productCategoryName + '-'+ productName,
                      price: productPrice,
                      category: productCategoryName // 保留第三层分类信息
                    };
                    tree[categoryName][subcategoryName].push(product);
                  });
                }
              });
            }
          } else if (typeof productItems === 'object' && productItems !== null) {
            // 格式如 {"百年好合":398, "喜结良缘":398}
            Object.keys(productItems).forEach(productName => {
              const productPrice = productItems[productName];
              const product = {
                name: productCategoryName + '-'+  productName,
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

    this.goodsData.forEach(categoryItem => {
      const categoryName = Object.keys(categoryItem)[0];
      const categoryContent = categoryItem[categoryName];

      categoryContent.forEach(subcategoryItem => {
        const subcategoryName = Object.keys(subcategoryItem)[0];
        const products = subcategoryItem[subcategoryName];

        products.forEach(productItem => {
          const productCategoryName = Object.keys(productItem)[0];
          const productItems = productItem[productCategoryName];

          // 处理第四层的具体商品
          if (Array.isArray(productItems)) {
            if (productItems.length >= 2 && typeof productItems[0] === 'string') {
              // 格式如 ["1套", 260]
              const productName = productItems[0];
              const productPrice = productItems[1];
              flatList.push({
                id: id++,
                category: categoryName,
                subcategory: subcategoryName,
                product_category: productCategoryName, // 第三层分类
                product_name: productName, // 第四层商品名
                price: productPrice,
                unit: productName // 使用商品名作为单位
              });
            } else {
              // 格式如 [{"百年好合":398}, {"喜结良缘":398}]
              productItems.forEach(item => {
                if (typeof item === 'object' && !Array.isArray(item)) {
                  Object.keys(item).forEach(productName => {
                    const productPrice = item[productName];
                    flatList.push({
                      id: id++,
                      category: categoryName,
                      subcategory: subcategoryName,
                      product_category: productCategoryName, // 第三层分类
                      product_name: productName, // 第四层商品名
                      price: productPrice,
                      unit: '个'
                    });
                  });
                }
              });
            }
          } else if (typeof productItems === 'object' && productItems !== null) {
            Object.keys(productItems).forEach(productName => {
              const productPrice = productItems[productName];
              flatList.push({
                id: id++,
                category: categoryName,
                subcategory: subcategoryName,
                product_category: productCategoryName, // 第三层分类
                product_name: productName, // 第四层商品名
                price: productPrice,
                unit: '个'
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
    const result = [];

    products.forEach(productItem => {
      const productCategoryName = Object.keys(productItem)[0];
      const productItems = productItem[productCategoryName];

      // 处理第四层的具体商品
      if (Array.isArray(productItems)) {
        if (productItems.length >= 2 && typeof productItems[0] === 'string') {
          // 格式如 ["1套", 260]
          const productName = productItems[0];
          const productPrice = productItems[1];
          result.push({
            name: productName,
            price: productPrice,
            category: productCategoryName,
            unit: productName
          });
        } else {
          // 格式如 [{"百年好合":398}, {"喜结良缘":398}]
          productItems.forEach(item => {
            if (typeof item === 'object' && !Array.isArray(item)) {
              Object.keys(item).forEach(productName => {
                const productPrice = item[productName];
                result.push({
                  name: productName,
                  price: productPrice,
                  category: productCategoryName,
                  unit: '个'
                });
              });
            }
          });
        }
      } else if (typeof productItems === 'object' && productItems !== null) {
        Object.keys(productItems).forEach(productName => {
          const productPrice = productItems[productName];
          result.push({
            name: productName,
            price: productPrice,
            category: productCategoryName,
            unit: '个'
          });
        });
      }
    });

    return result;
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
          const productCategoryName = Object.keys(productItem)[0];
          const productItems = productItem[productCategoryName];

          // 处理第四层的具体商品
          const processProduct = (productName, productPrice) => {
            // 检查名称或分类是否匹配
            if (
              productName.toLowerCase().includes(lowerKeyword) ||
              productCategoryName.toLowerCase().includes(lowerKeyword) ||
              categoryName.toLowerCase().includes(lowerKeyword) ||
              subcategoryName.toLowerCase().includes(lowerKeyword)
            ) {
              results.push({
                name: productName,
                price: productPrice,
                category: categoryName,
                subcategory: subcategoryName,
                product_category: productCategoryName,
                unit: '个'
              });
            }
          };

          if (Array.isArray(productItems)) {
            if (productItems.length >= 2 && typeof productItems[0] === 'string') {
              // 格式如 ["1套", 260]
              const productName = productItems[0];
              const productPrice = productItems[1];
              processProduct(productName, productPrice);
            } else {
              // 格式如 [{"百年好合":398}, {"喜结良缘":398}]
              productItems.forEach(item => {
                if (typeof item === 'object' && !Array.isArray(item)) {
                  Object.keys(item).forEach(productName => {
                    processProduct(productName, item[productName]);
                  });
                }
              });
            }
          } else if (typeof productItems === 'object' && productItems !== null) {
            Object.keys(productItems).forEach(productName => {
              processProduct(productName, productItems[productName]);
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
