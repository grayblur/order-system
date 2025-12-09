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
    // 计算商品汇总数据
    const productSummary = {}
    let grandTotal = 0

    printData.forEach(order => {
      const customerInfo = order.customer_info || {}
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          // 使用小类-商品名作为key（不含大类）
          const nameWithoutMainCategory = `${item.product_category || ''}-${item.name || ''}`
          const key = nameWithoutMainCategory
          if (!productSummary[key]) {
            productSummary[key] = {
              category: item.category || '',
              name: nameWithoutMainCategory,
              quantity: 0,
              unit: item.unit || '份'
            }
          }
          productSummary[key].quantity += item.quantity
        })
      }
      grandTotal += customerInfo.total_amount || 0
    })

    // 按大类排序（花馍优先，然后果蔬）
    const sortedProducts = Object.values(productSummary).sort((a, b) => {
      const order = { '花馍': 1, '果蔬': 2 }
      const aOrder = order[a.category] || 999
      const bOrder = order[b.category] || 999
      return aOrder - bOrder
    })

    let lastCategory = ''
    const productSummaryHtml = sortedProducts
      .map((product) => {
        const showCategory = product.category !== lastCategory
        const categoryDisplay = showCategory ? product.category : ''
        lastCategory = product.category

        return `
        <tr>
          <td style="text-align: center;">${categoryDisplay}</td>
          <td>${product.name}</td>
          <td style="text-align: center; font-weight: bold; font-size: 26px;">${product.quantity} ${product.unit}</td>
        </tr>
      `
      }).join('')

    const orderDetailsHtml = printData
      .map((order, index) => {
        const customerInfo = order.customer_info || {}
        const itemsHtml = order.items && order.items.length > 0
          ? order.items.map(item => {
              // 显示完整的大类-小类-商品名
              const fullName = `${item.category || ''}-${item.product_category || ''}-${item.name || ''}`
              return `<li><span class="product-item-name">${fullName}</span> x ${item.quantity}</li>`
            }).join('')
          : '<li>无商品信息</li>'

        // 计算是否已结清
        const totalAmount = customerInfo.total_amount || 0
        const paidAmount = customerInfo.paid_amount || 0
        const isSettled = paidAmount >= totalAmount
        const settlementStatus = isSettled ? '是' : '否'

        return `
          <tr>
            <td>
              <strong>${customerInfo.name || '未知客户'}</strong><br>
              <span style="font-size: 20px;">${customerInfo.address || '无地址'}</span>
            </td>
            <td>${customerInfo.phone || '无电话'}</td>
            <td>
              <ul class="product-list">
                ${itemsHtml}
              </ul>
            </td>
            <td class="amount">¥ ${totalAmount.toFixed(2)}</td>
            <td style="text-align: center; font-size: 24px; font-weight: bold;">${settlementStatus}</td>
            <td>${customerInfo.notes || '无'}</td>
          </tr>
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
                <th style="width: 10%;">分类</th>
                <th style="width: 60%;">商品名称</th>
                <th style="width: 30%;">总数量</th>
              </tr>
            </thead>
            <tbody>
              ${productSummaryHtml || '<tr><td colspan="3" style="text-align: center;">暂无商品数据</td></tr>'}
            </tbody>
          </table>

          <h2>📋 用户订单明细</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">客户信息 (姓名/地址)</th>
                <th style="width: 12%;">联系电话</th>
                <th style="width: 28%;">商品信息</th>
                <th style="width: 10%;">金额</th>
                <th style="width: 15%;">结清状态</th>
                <th style="width: 15%;">备注信息</th>
              </tr>
            </thead>
            <tbody>
              ${orderDetailsHtml}
            </tbody>
          </table>

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