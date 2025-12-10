const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const printCommand = require('./printCommand');

const execAsync = util.promisify(exec);

class PrinterService {
  constructor() {
    this.printers = [];
    this.lastRefresh = null;
  }

  // 获取系统打印机列表
  async getSystemPrinters() {
    try {
      const platform = process.platform;
      let printers = [];

      if (platform === 'linux') {
        printers = await this.getLinuxPrinters();
      } else if (platform === 'win32') {
        printers = await this.getWindowsPrinters();
      } else if (platform === 'darwin') {
        printers = await this.getMacPrinters();
      }

      this.printers = printers;
      this.lastRefresh = new Date();
      return printers;
    } catch (error) {
      console.error('获取打印机列表失败:', error);
      return [];
    }
  }

  // Linux系统打印机发现 (使用lpstat命令)
  async getLinuxPrinters() {
    try {
      const { stdout } = await execAsync('lpstat -p 2>/dev/null || echo "No printers found"');
      const lines = stdout.split('\n');
      const printers = [];

      for (const line of lines) {
        // 支持中文和英文输出格式
        let match = line.match(/(?:printer |打印机 )(.+?)(?: is | )(.+?)(?:\. | now|目前)/);
        if (!match) {
          // 尝试更宽松的匹配模式
          match = line.match(/(?:printer |打印机 )(.+?)(?: is | )(.*?)(?:\.|开始启用|since)/);
        }
        if (match) {
          let [, name, status] = match;
          // 清理状态信息，去除时间戳等
          status = status.replace(/现在|目前|空闲|启用.*/, '空闲');
          printers.push({
            name: name.trim(),
            status: status.trim(),
            platform: 'linux',
            isDefault: false,
            capabilities: await this.getLinuxPrinterCapabilities(name)
          });
        }
      }

      // 检查默认打印机
      try {
        const { stdout: defaultOutput } = await execAsync('lpstat -d 2>/dev/null');
        // 支持中英文默认打印机输出
        let defaultMatch = defaultOutput.match(/system default destination: (.+)/);
        if (!defaultMatch) {
          defaultMatch = defaultOutput.match(/系统默认目标：(.+)/);
        }
        if (defaultMatch) {
          const defaultName = defaultMatch[1].trim();
          const defaultPrinter = printers.find(p => p.name === defaultName);
          if (defaultPrinter) {
            defaultPrinter.isDefault = true;
          }
        }
      } catch (e) {
        // 忽略获取默认打印机的错误
      }

      return printers;
    } catch (error) {
      console.error('Linux打印机发现失败:', error);
      return [];
    }
  }

  // 获取Linux打印机能力
  async getLinuxPrinterCapabilities(printerName) {
    try {
      const { stdout } = await execAsync(`lpoptions -p ${printerName} 2>/dev/null`);
      const options = stdout.split('\n');
      const capabilities = {
        supportedFormats: ['PDF', 'TXT'],
        colorSupport: options.some(opt => opt.includes('Color')),
        duplexSupport: options.some(opt => opt.includes('Duplex')),
        paperSizes: this.extractPaperSizes(options)
      };
      return capabilities;
    } catch (error) {
      return {
        supportedFormats: ['PDF', 'TXT'],
        colorSupport: false,
        duplexSupport: false,
        paperSizes: ['A4']
      };
    }
  }

  // Windows系统打印机发现 (使用wmic命令)
  async getWindowsPrinters() {
    try {
      const { stdout } = await execAsync('wmic printer get Name,Status,Default /format:csv 2>nul');
      const lines = stdout.split('\n').filter(line => line.trim());
      const printers = [];

      // 跳过标题行
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const parts = line.split(',');
          if (parts.length >= 4) {
            const [, name, status, isDefault] = parts;
            printers.push({
              name: name.trim(),
              status: status.trim() || 'Unknown',
              platform: 'win32',
              isDefault: isDefault.trim().toUpperCase() === 'TRUE',
              capabilities: {
                supportedFormats: ['PDF', 'TXT', 'DOC'],
                colorSupport: true,
                duplexSupport: true,
                paperSizes: ['A4', 'Letter']
              }
            });
          }
        }
      }

      return printers;
    } catch (error) {
      console.error('Windows打印机发现失败:', error);
      return [];
    }
  }

  // macOS系统打印机发现 (使用lpstat命令)
  async getMacPrinters() {
    try {
      const { stdout } = await execAsync('lpstat -p 2>/dev/null || echo "No printers found"');
      const lines = stdout.split('\n');
      const printers = [];

      for (const line of lines) {
        const match = line.match(/printer (.+) is (.+)/.source);
        if (match) {
          const [, name, status] = match;
          printers.push({
            name: name.trim(),
            status: status.trim(),
            platform: 'darwin',
            isDefault: false,
            capabilities: {
              supportedFormats: ['PDF', 'TXT'],
              colorSupport: true,
              duplexSupport: true,
              paperSizes: ['A4', 'Letter']
            }
          });
        }
      }

      return printers;
    } catch (error) {
      console.error('macOS打印机发现失败:', error);
      return [];
    }
  }

  // 提取纸张尺寸
  extractPaperSizes(options) {
    const sizes = ['A4', 'A3', 'Letter', 'Legal'];
    const foundSizes = [];

    for (const size of sizes) {
      if (options.some(opt => opt.toLowerCase().includes(size.toLowerCase()))) {
        foundSizes.push(size);
      }
    }

    return foundSizes.length > 0 ? foundSizes : ['A4'];
  }

  // 打印文档到指定打印机
  async printDocument(printerName, documentPath, options = {}) {
    try {
      const platform = process.platform;
      let command;

      if (platform === 'linux') {
        command = `lp -d "${printerName}" "${documentPath}"`;
        if (options.copies) {
          command += ` -n ${options.copies}`;
        }
      } else if (platform === 'win32') {
        // Windows打印 - 使用命令行
        command = `powershell -Command "& {Add-Type -AssemblyName System.Drawing; Add-Type -AssemblyName System.Windows.Forms; $doc = New-Object System.Drawing.Printing.PrintDocument; $doc.DocumentName = '${path.basename(documentPath)}'; $doc.PrinterSettings.PrinterName = '${printerName}'; Start-Process -FilePath '${documentPath}' -ArgumentList '/p' -Wait}"`;
      } else if (platform === 'darwin') {
        command = `lp -d "${printerName}" "${documentPath}"`;
        if (options.copies) {
          command += ` -n ${options.copies}`;
        }
      }

      const { stdout, stderr } = await execAsync(command);

      return {
        success: true,
        message: '打印任务已提交',
        output: stdout,
        error: stderr
      };
    } catch (error) {
      console.error('打印失败:', error);
      return {
        success: false,
        message: '打印失败',
        error: error.message
      };
    }
  }

  // 获取网络打印机 (通过IPP协议)
  async getNetworkPrinters() {
    try {
      // 这里可以实现IPP或SNMP网络打印机发现
      // 为了简化，暂时返回空数组
      console.log('网络打印机发现功能待实现');
      return [];
    } catch (error) {
      console.error('网络打印机发现失败:', error);
      return [];
    }
  }

  // 刷新打印机列表
  async refreshPrinters() {
    await this.getSystemPrinters();
    return this.printers;
  }

  // 获取打印机状态
  getPrinterStatus(printerName) {
    const printer = this.printers.find(p => p.name === printerName);
    return printer ? printer.status : 'Unknown';
  }

  // 打印订单生产清单
  async printProductionList(printData, printerName, dateStr) {
    try {
      console.log(`准备打印 ${dateStr} 的生产清单，共 ${printData.length} 个订单`);

      // 使用新的打印命令服务
      const result = await printCommand.printWithSystemCommand(
        printData,
        printerName,
        dateStr
      );

      return result;
    } catch (error) {
      console.error('打印生产清单失败:', error);
      return {
        success: false,
        message: `打印失败: ${error.message}`
      };
    }
  }

  // 创建打印预览PDF (临时文件)
  async createPrintPreview(content, filename = 'preview.pdf') {
    try {
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const filePath = path.join(tempDir, filename);

      // 这里应该使用PDF生成库来创建PDF
      // 为了简化，我们暂时创建一个文本文件
      fs.writeFileSync(filePath, content, 'utf8');

      return filePath;
    } catch (error) {
      console.error('创建打印预览失败:', error);
      return null;
    }
  }
}

module.exports = new PrinterService();