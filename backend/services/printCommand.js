const printCommand = {
  /**
   * 调用系统打印命令
   * @param {Object} printData - 打印数据
   * @param {string} printerName - 打印机名称
   * @param {string} dateStr - 日期字符串
   */
  async printWithSystemCommand(printData, printerName, dateStr) {
    return new Promise((resolve, reject) => {
      try {
        // 生成打印HTML文件
        let printContent = this.generatePrintHTML(printData, dateStr)

        // 创建临时HTML文件
        const fs = require('fs')
        const path = require('path')
        const os = require('os')

        const tempDir = os.tmpdir()
        const printFileName = `print_${Date.now()}.html`
        const printFilePath = path.join(tempDir, printFileName)

        // 写入临时文件
        fs.writeFileSync(printFilePath, printContent, 'utf8')

        // 根据操作系统选择打印命令
        const { exec } = require('child_process')

        if (process.platform === 'win32') {
          // Windows 打印命令
          let printCommand = `start /min mshtml.exe "${printFilePath}" && timeout /t 2 && taskkill /im mshtml.exe /f`
          if (printerName) {
            printCommand = printCommand.replace('--print', `--print-to-printer="${printerName}"`)
          }
          exec(printCommand, (error, stdout, stderr) => {
            setTimeout(() => {
              try { fs.unlinkSync(printFilePath) } catch (e) { console.error('清理临时文件失败:', e) }
            }, 5000)
            if (error) {
              console.error('打印命令执行失败:', error)
              reject(error)
            } else {
              resolve({ success: true, message: '打印命令已发送' })
            }
          })
        } else if (process.platform === 'darwin') {
          // macOS 打印命令
          const printCommand = `open -a "Google Chrome" --args --disable-print-preview --print "${printFilePath}"`
          exec(printCommand, (error, stdout, stderr) => {
            setTimeout(() => {
              try { fs.unlinkSync(printFilePath) } catch (e) { console.error('清理临时文件失败:', e) }
            }, 5000)
            if (error) {
              console.error('打印命令执行失败:', error)
              reject(error)
            } else {
              resolve({ success: true, message: '打印命令已发送' })
            }
          })
        } else {
          // Linux - 先用 wkhtmltopdf 将 HTML 转换为 PDF，再用 lp 打印
          const pdfFilePath = printFilePath.replace('.html', '.pdf')
          const convertCommand = `wkhtmltopdf --page-size A4 --margin-top 10mm --margin-bottom 10mm --margin-left 10mm --margin-right 10mm --encoding utf-8 "${printFilePath}" "${pdfFilePath}"`

          exec(convertCommand, (convertError, convertStdout, convertStderr) => {
            if (convertError) {
              console.error('HTML转PDF失败:', convertError)
              // 清理HTML文件
              try { fs.unlinkSync(printFilePath) } catch (e) {}
              reject(new Error('HTML转PDF失败: ' + convertError.message))
              return
            }

            // PDF转换成功，发送到打印机
            const printCommand = `lp -d "${printerName || 'Default'}" "${pdfFilePath}"`
            exec(printCommand, (printError, printStdout, printStderr) => {
              // 清理临时文件
              setTimeout(() => {
                try { fs.unlinkSync(printFilePath) } catch (e) {}
                try { fs.unlinkSync(pdfFilePath) } catch (e) {}
              }, 5000)

              if (printError) {
                console.error('打印命令执行失败:', printError)
                reject(printError)
              } else {
                console.log('打印任务已发送:', printStdout)
                resolve({ success: true, message: '打印命令已发送' })
              }
            })
          })
        }

      } catch (error) {
        console.error('打印失败:', error)
        reject(error)
      }
    })
  },

  /**
   * 生成打印HTML内容
   * @param {Object} printData - 打印数据
   * @param {string} dateStr - 日期字符串
   */
  generatePrintHTML(printData, dateStr) {
    // 计算商品汇总数据 - 按第2层（subcategory）和第3层（productCategory）分组
    const subcategoryGroups = {}
    let grandTotal = 0

    printData.forEach(order => {
      const customerInfo = order.customer_info || {}
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          // 使用前两层作为主分组key：大类-子类
          const subcategoryKey = `${item.category || ''}-${item.subcategory || ''}`

          if (!subcategoryGroups[subcategoryKey]) {
            subcategoryGroups[subcategoryKey] = {
              category: item.category || '',
              subcategory: item.subcategory || '',
              productCategories: {}  // 第3层分类
            }
          }

          // 在该子分类下，按第3层（productCategory）分组
          const productCategory = item.product_category || ''
          if (!subcategoryGroups[subcategoryKey].productCategories[productCategory]) {
            subcategoryGroups[subcategoryKey].productCategories[productCategory] = {
              name: productCategory,
              products: {},
              totalQuantity: 0
            }
          }

          // 记录具体商品
          const productName = item.name || ''
          if (!subcategoryGroups[subcategoryKey].productCategories[productCategory].products[productName]) {
            subcategoryGroups[subcategoryKey].productCategories[productCategory].products[productName] = {
              name: productName,
              quantity: 0,
              unit: item.unit || '个'
            }
          }

          // 判断商品名称是否为纯数字或包含数字（如"12"、"12个"）
          const numMatch = productName.match(/^(\d+)/)
          let quantityToAdd = item.quantity
          if (numMatch) {
            const productNumber = parseInt(numMatch[1])
            quantityToAdd = productNumber * item.quantity
          }

          subcategoryGroups[subcategoryKey].productCategories[productCategory].products[productName].quantity += item.quantity
          subcategoryGroups[subcategoryKey].productCategories[productCategory].totalQuantity += quantityToAdd
        })
      }
      grandTotal += customerInfo.total_amount || 0
    })

    // 枣糕分类的固定排序顺序
    const zaogaoOrder = [
      '上头糕', '剃头糕', '大项圈', '小项圈', '上头馍',
      '馄饨馍', '双馄饨', '石榴馍', '订婚花馍',
      '馄饨花馍', '大龙凤'
    ]

    // 果蔬分类的固定排序顺序
    const guoshuOrder = [
      '满月','百日',  '周岁', '12岁', '结婚', '过寿', '乔迁'
    ]

    // 按大类分组，然后在每个大类内按指定顺序排序
    const categoryGroups = {}
    Object.values(subcategoryGroups).forEach(group => {
      const categoryName = group.category
      if (!categoryGroups[categoryName]) {
        categoryGroups[categoryName] = {
          name: categoryName,
          subcategories: []
        }
      }
      categoryGroups[categoryName].subcategories.push(group)
    })

    // 排序各大类
    const sortedCategories = Object.values(categoryGroups).sort((a, b) => {
      const categoryOrder = { '枣糕': 1, '花馍': 1, '果蔬': 2 }
      const aOrder = categoryOrder[a.name] || 999
      const bOrder = categoryOrder[b.name] || 999
      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }
      return a.name.localeCompare(b.name, 'zh-CN')
    })

    // 排序每个大类内的子分类
    sortedCategories.forEach(categoryGroup => {
      if (categoryGroup.name === '枣糕') {
        // 枣糕按固定顺序排序
        categoryGroup.subcategories.sort((a, b) => {
          const aIndex = zaogaoOrder.indexOf(a.subcategory)
          const bIndex = zaogaoOrder.indexOf(b.subcategory)
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex
          }
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return a.subcategory.localeCompare(b.subcategory, 'zh-CN')
        })
      } else if (categoryGroup.name === '果蔬') {
        // 果蔬按固定顺序排序
        categoryGroup.subcategories.sort((a, b) => {
          const aIndex = guoshuOrder.indexOf(a.subcategory)
          const bIndex = guoshuOrder.indexOf(b.subcategory)
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex
          }
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return a.subcategory.localeCompare(b.subcategory, 'zh-CN')
        })
      } else {
        // 其他大类按子分类名称排序
        categoryGroup.subcategories.sort((a, b) => {
          return a.subcategory.localeCompare(b.subcategory, 'zh-CN')
        })
      }
    })

    // 生成HTML表格行
    const productSummaryRows = []
    sortedCategories.forEach(categoryGroup => {
      // 如果不是"其他"大类，先单独显示大类名称行
      if (categoryGroup.name !== '其他') {
        productSummaryRows.push(`
          <tr>
            <td colspan="3" style="text-align: center; font-weight: bold; font-size: 18px; background-color: #f0f0f0; padding: 8px;">
              🌺 ${categoryGroup.name} 🌺
            </td>
          </tr>
        `)
      }

      // 处理该大类下的子分类
      categoryGroup.subcategories.forEach(subcategoryGroup => {
        const productCategories = Object.values(subcategoryGroup.productCategories).sort((a, b) => {
          return a.name.localeCompare(b.name, 'zh-CN')
        })

        // 计算该子分类的总数量
        const subcategoryTotalQuantity = productCategories.reduce((sum, pc) => sum + pc.totalQuantity, 0)

        productCategories.forEach((productCategoryData, index) => {
          const products = Object.values(productCategoryData.products)

          // 生成商品名称列表：商品名(数量个)格式
          const productsList = products.map(product =>
            `${product.name}(${product.quantity}个)`
          ).join('、')

          // 第一行显示子分类名称和总数量，后续行不显示（通过rowspan实现）
          if (index === 0) {
            productSummaryRows.push(`
              <tr>
                <td style="text-align: center; font-weight: bold; vertical-align: middle;" rowspan="${productCategories.length}">
                  ${subcategoryGroup.subcategory}
                </td>
                <td style="padding-left: 10px;">
                  <strong>${productCategoryData.name}:</strong> ${productsList}
                </td>
                <td style="text-align: center; font-weight: bold; font-size: 20px; vertical-align: middle;" rowspan="${productCategories.length}">
                  ${subcategoryTotalQuantity} 个
                </td>
              </tr>
            `)
          } else {
            productSummaryRows.push(`
              <tr>
                <td style="padding-left: 10px;">
                  <strong>${productCategoryData.name}:</strong> ${productsList}
                </td>
              </tr>
            `)
          }
        })
      })
    })

    const productSummaryHtml = productSummaryRows.join('')

    const orderDetailsHtml = printData
      .map((order) => {
        const customerInfo = order.customer_info || {}
        const itemsHtml = order.items && order.items.length > 0
          ? order.items.map(item => {
              // 显示完整的大类-小类-商品名
              const fullName = `${item.category || ''}-${item.subcategory || ''}-${item.product_category || ''}-${item.name || ''}`
              return `<li><span class="product-item-name">${fullName}</span> x ${item.quantity}</li>`
            }).join('')
          : '<li>无商品信息</li>'

        // 计算是否已结清
        const totalAmount = customerInfo.total_amount || 0
        const paidAmount = customerInfo.paid_amount || 0
        const isSettled = paidAmount >= totalAmount
        const settlementStatus = isSettled
          ? '<span style="font-size: 24px; font-weight: bold;">✓</span>'
          : '<span style="font-size: 24px; font-weight: bold;">⭕</span>'

        return `
          <div class="order-card">
            <div class="order-header">
              <div class="customer-info">
                <h3 class="customer-name">${customerInfo.name || '未知客户'}</h3>
                <div class="contact-details">
                  <span class="phone">📞 ${customerInfo.phone || '无电话'}</span>
                  <span class="address">📍 ${customerInfo.address || '无地址'}</span>
                </div>
              </div>
              <div class="order-summary">
                <div class="amount">¥ ${totalAmount.toFixed(2)}</div>
                <div class="settlement-status">${settlementStatus}</div>
              </div>
            </div>
            <div class="order-content">
              <div class="products-section">
                <h4>📦 商品清单</h4>
                <ul class="product-list">
                  ${itemsHtml}
                </ul>
              </div>
              ${customerInfo.notes ? `<div class="notes-section"><h4>📝 备注信息</h4><p>${customerInfo.notes}</p></div>` : ''}
            </div>
          </div>
        `
      }).join('')

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>生产清单汇总</title>
        <style>
          @page {
            size: A4;
            margin: 1cm;
          }

          body {
            font-family: "Microsoft YaHei", "SimSun", sans-serif;
            margin: 0;
            padding: 20px;
            color: #000;
            font-size: 24px;
            -webkit-print-color-adjust: exact;
          }

          .container {
            width: 100%;
            max-width: none;
            background: white;
            padding: 0;
            margin: 0;
          }

          h1 {
            text-align: center;
            font-size: 34px;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            color: #000;
          }

          h2 {
            font-size: 28px;
            margin-top: 30px;
            margin-bottom: 10px;
            border-left: 5px solid #000;
            padding-left: 10px;
            color: #000;
          }

          .summary-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 24px;
            color: #000;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 24px;
            color: #000;
          }

          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            vertical-align: top;
            color: #000;
          }

          th {
            background-color: #eee;
            font-weight: bold;
            text-align: center;
          }

          .product-list {
            margin: 0;
            padding-left: 0;
            list-style: none;
          }

          .product-list li {
            margin-bottom: 4px;
          }

          .product-item-name {
            font-weight: bold;
          }

          .amount {
            text-align: right;
            font-family: Arial, sans-serif;
          }

          tr {
            page-break-inside: avoid;
          }

          h2 {
            margin-top: 20px;
          }

          .no-print {
            display: none;
          }

          /* 订单卡片样式 */
          .order-cards-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-top: 20px;
          }

          .order-card {
            border: 1px solid #000;
            border-radius: 4px;
            background: #fff;
            page-break-inside: avoid;
            margin-bottom: 8px;
          }

          .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #f8f9fa;
            border-bottom: 1px solid #000;
          }

          .customer-info {
            flex: 1;
          }

          .customer-name {
            margin: 0 0 4px 0;
            font-size: 16px;
            color: #333;
          }

          .contact-details {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .phone, .address {
            font-size: 12px;
            color: #666;
          }

          .order-summary {
            text-align: right;
          }

          .order-summary .amount {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 4px;
          }

          .order-content {
            padding: 12px;
          }

          .products-section {
            margin-bottom: 10px;
          }

          .products-section h4 {
            margin: 0 0 6px 0;
            font-size: 14px;
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 2px;
          }

          .product-list {
            margin: 0;
            padding-left: 0;
            list-style: none;
          }

          .product-list li {
            margin-bottom: 4px;
            padding: 4px 6px;
            background: #f8f9fa;
            border-radius: 2px;
            font-size: 12px;
            line-height: 1.3;
          }

          .notes-section {
            margin-top: 8px;
          }

          .notes-section h4 {
            margin: 0 0 4px 0;
            font-size: 12px;
            color: #333;
          }

          .notes-section p {
            margin: 0;
            padding: 6px 8px;
            background: #fff3cd;
            border-left: 3px solid #ffc107;
            border-radius: 2px;
            font-size: 12px;
          }

          @media screen {
            body {
              background-color: #f0f0f0;
            }

            .container {
              max-width: 210mm;
              margin: 0 auto;
              background: white;
              padding: 20px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }

            .no-print {
              display: block;
              text-align: center;
              margin-bottom: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${dateStr} 生产明细</h1>

          <div class="summary-info">
            <div><strong>订单总数：</strong>${printData.length} 单</div>
            <div><strong>总金额：</strong>¥ ${grandTotal.toFixed(2)}</div>
          </div>

          <h2>📊 当日生产总量统计</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">分类</th>
                <th style="width: 55%;">商品名称</th>
                <th style="width: 30%;">总数量</th>
              </tr>
            </thead>
            <tbody>
              ${productSummaryHtml || '<tr><td colspan="3" style="text-align: center;">暂无商品数据</td></tr>'}
            </tbody>
          </table>

          <h2>📋 用户订单明细</h2>
          <div class="order-cards-container">
            ${orderDetailsHtml}
          </div>

          <div style="margin-top: 20px; text-align: right; font-size: 20px; color: #000;">
            打印时间: ${new Date().toLocaleString()}
          </div>
        </div>

        <script>
          // 页面加载完成后自动打印
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 500);
          }

          // 打印完成后关闭窗口
          window.onafterprint = function() {
            window.close();
          }
        </script>
      </body>
      </html>
    `
  }
}

module.exports = printCommand