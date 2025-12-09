const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

// 配置文件上传
const upload = multer({ dest: 'uploads/' });


// 获取已配置的打印机列表
app.get('/api/printers', async (req, res) => {
    try {
        const { stdout } = await execPromise('lpstat -p');
        const printers = stdout.split('\n')
            .filter(line => line.startsWith('printer'))
            .map(line => {
                const match = line.match(/printer (\S+)/);
                return match ? match[1] : null;
            })
            .filter(Boolean);
        
        res.json({ success: true, printers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 添加网络打印机
app.post('/api/add-printer', express.json(), async (req, res) => {
    try {
        const { name, ip, protocol = 'ipp' } = req.body;
        
        if (!name || !ip) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name and IP are required' 
            });
        }

        // 构建打印机URI
        let uri;
        switch(protocol) {
            case 'ipp':
                uri = `ipp://${ip}/ipp/print`;
                break;
            case 'socket':
                uri = `socket://${ip}:9100`;
                break;
            case 'lpd':
                uri = `lpd://${ip}/queue`;
                break;
            default:
                uri = `ipp://${ip}/ipp/print`;
        }

        // 添加打印机
        const addCmd = `sudo lpadmin -p ${name} -v ${uri} -E -m everywhere`;
        await execPromise(addCmd);
        
        // 设置为默认打印机
        await execPromise(`sudo lpadmin -d ${name}`);
        
        res.json({ 
            success: true, 
            message: `Printer ${name} added successfully`,
            uri 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 打印文件
app.post('/api/print', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }

        const { printer, copies = 1, duplex = false } = req.body;
        const filePath = req.file.path;

        // 构建打印命令
        let printCmd = `lp`;
        
        if (printer) {
            printCmd += ` -d ${printer}`;
        }
        
        printCmd += ` -n ${copies}`;
        
        if (duplex === 'true' || duplex === true) {
            printCmd += ` -o sides=two-sided-long-edge`;
        }
        
        printCmd += ` ${filePath}`;

        // 执行打印
        const { stdout } = await execPromise(printCmd);
        
        // 提取任务ID
        const jobMatch = stdout.match(/request id is (\S+)/);
        const jobId = jobMatch ? jobMatch[1] : null;

        // 清理上传的文件
        setTimeout(async () => {
            try {
                await fs.unlink(filePath);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }, 5000);

        res.json({ 
            success: true, 
            message: 'Print job submitted',
            jobId,
            file: req.file.originalname
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取打印任务状态
app.get('/api/jobs', async (req, res) => {
    try {
        const { stdout } = await execPromise('lpstat -o');
        res.json({ success: true, jobs: stdout });
    } catch (error) {
        // 没有打印任务时lpstat会返回错误
        res.json({ success: true, jobs: 'No print jobs' });
    }
});

// 取消打印任务
app.delete('/api/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        await execPromise(`lprm ${jobId}`);
        res.json({ success: true, message: `Job ${jobId} cancelled` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建uploads目录
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

app.listen(port, '0.0.0.0', () => {
    console.log(`Printer server running at http://0.0.0.0:${port}`);
    console.log('API endpoints:');
    console.log('  GET  /api/discover-printers - Discover network printers');
    console.log('  GET  /api/printers - List configured printers');
    console.log('  POST /api/add-printer - Add a network printer');
    console.log('  POST /api/print - Print a file');
    console.log('  GET  /api/jobs - Get print jobs');
    console.log('  DELETE /api/jobs/:jobId - Cancel a print job');
});
