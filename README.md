# 花馍订单管理系统

一个专为婚礼、订婚、生日等喜庆场合设计的花馍订单管理系统，支持客户信息管理、产品选择、订单处理和生产清单打印。

## 🌟 系统特性

### 核心功能
- **订单管理**: 完整的订单录入、编辑和查询功能
- **客户管理**: 客户信息记录和管理
- **产品目录**: 分层产品分类（结婚/订婚/生日 → 上头糕/剃头糕 → 具体商品）
- **生产清单**: 按日期生成生产清单，支持打印
- **支付跟踪**: 订单支付状态管理

### 技术特性
- **现代化架构**: Vue 3 + Node.js + SQLite
- **响应式设计**: 支持桌面、平板、手机
- **数据备份**: 自动备份到GitHub
- **热更新**: 开发环境实时热更新
- **容器化**: 支持Docker部署

## 🏗️ 系统架构

### 技术栈
- **前端**: Vue 3 + Vite + Element Plus
- **后端**: Node.js + Express
- **数据库**: SQLite
- **部署**: 本地开发 / Docker

### 项目结构
```
order-system/
├── backend/              # Node.js 后端服务
│   ├── server.js         # 主服务文件
│   ├── stable-server.js  # 生产环境服务
│   ├── routes/           # API路由
│   ├── models/           # 数据模型
│   └── database.db       # SQLite数据库
├── frontend/             # Vue 3 前端应用
│   ├── src/              # 源代码
│   ├── dist/             # 构建文件
│   └── vite.config.js    # Vite配置
├── backups/              # 数据备份系统
│   ├── scripts/          # 备份脚本
│   └── logs/             # 备份日志
├── config/               # 配置文件
│   └── goods.json        # 产品目录
└── docs/                 # 项目文档
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Git

### 本地开发（推荐）

#### 1. 启动后端服务
```bash
cd backend
node stable-server.js
```
后端服务将在 `http://localhost:3000` 启动

#### 2. 启动前端开发服务
```bash
cd frontend
npm install --legacy-peer-deps  # 仅首次需要
npm run dev
```
前端服务将在 `http://localhost:5173` 启动

#### 3. 访问应用
- 前端应用: http://localhost:5173
- 后端API: http://localhost:3000
- 健康检查: http://localhost:3000/health

### Docker部署（可选）

```bash
# 启动开发环境
docker-compose up

# 构建并启动
docker-compose up --build

# 停止服务
docker-compose down
```

## 📊 数据备份系统

### 自动备份配置
- **备份频率**: 每天凌晨2点
- **备份位置**: GitHub私有仓库
- **保留期限**: 30天
- **压缩格式**: gzip

### 手动备份
```bash
# 执行备份
bash backups/scripts/backup.sh

# 查看日志
cat backups/logs/backup_$(date +%Y-%m-%d).log
```

### 数据恢复
```bash
# 查看可用备份
bash backups/scripts/restore.sh --list

# 恢复最新备份
bash backups/scripts/restore.sh --latest

# 恢复指定日期
bash backups/scripts/restore.sh --restore 2025-12-13
```

## 🎨 用户界面

### 布局设计
- **左侧区域 (60%)**: 客户信息录入
  - 客户姓名、地址
  - 联系电话
  - 交货日期
  - 备注信息

- **右侧区域 (40%)**: 产品选择
  - 多级分类选择
  - 数量调整
  - 实时价格计算

### 设计风格
- **主色调**: 中国红 (#E74C3C)
- **辅助色**: 金色 (#F39C12)
- **字体**: PingFang SC / Microsoft YaHei

## 📋 API接口

### 核心接口
```bash
# 健康检查
GET /health

# API信息
GET /api

# 订单管理
GET /api/orders          # 获取所有订单
POST /api/orders         # 创建新订单

# 产品目录
GET /api/goods           # 获取产品目录

# 生产清单
GET /api/orders/production/YYYY-MM-DD  # 获取指定日期生产清单
```

### 数据格式
```javascript
// 订单数据结构
{
  "customer": {
    "name": "客户姓名",
    "address": "客户地址",
    "phone": "联系电话",
    "deliveryDate": "2025-12-13",
    "notes": "备注信息"
  },
  "items": [
    {
      "id": "product_id",
      "name": "产品名称",
      "category": "产品分类",
      "quantity": 1,
      "price": 100
    }
  ],
  "total": 100,
  "paid": false,
  "createdAt": "2025-12-13T09:00:00.000Z"
}
```

## 🔧 配置说明

### 环境变量
```bash
# GitHub备份Token (自动备份需要)
export GITHUB_TOKEN="your_github_token"

# 数据库路径
export DB_PATH="./database.db"
```

### 产品配置
产品目录配置在 `config/goods.json`:
```json
{
  "花馍": {
    "结婚": {
      "上头糕": {
        "商品名": {
          "price": 100,
          "description": "商品描述"
        }
      }
    }
  }
}
```

## 📱 响应式设计

### 屏幕适配
- **桌面 (≥1200px)**: 完整功能布局
- **平板 (768-1199px)**: 自适应布局
- **手机 (<768px)**: 紧凑布局

### ARM平台优化
- 使用ARM64原生镜像
- 优化构建过程
- 减少资源占用

## 🔒 安全特性

### 数据安全
- SQLite数据库加密存储
- 定期自动备份
- 访问日志记录

### 网络安全
- 输入数据验证
- XSS防护
- CSRF保护

## 🐛 故障排除

### 常见问题

#### 1. 服务启动失败
```bash
# 检查端口占用
lsof -i :3000
lsof -i :5173

# 检查Node.js版本
node --version
```

#### 2. 数据库连接问题
```bash
# 检查数据库文件
ls -la backend/database.db

# 验证数据库完整性
sqlite3 backend/database.db "PRAGMA integrity_check;"
```

#### 3. 备份失败
```bash
# 检查GitHub Token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# 查看备份日志
tail -20 backups/logs/backup_$(date +%Y-%m-%d).log
```

### 调试模式
```bash
# 前端调试
cd frontend && npm run dev

# 后端调试
cd backend && DEBUG=* node stable-server.js

# 备份调试
bash -x backups/scripts/backup.sh
```

## 📈 性能优化

### 前端优化
- Vite HMR热更新
- 代码分割和懒加载
- 静态资源压缩

### 后端优化
- 数据库索引优化
- 缓存机制
- 响应压缩

### 部署优化
- Docker多阶段构建
- ARM平台优化
- 资源限制配置

## 🔄 版本历史

### v1.0.0 (2025-12-13)
- ✅ 基础订单管理功能
- ✅ 客户信息管理
- ✅ 产品目录系统
- ✅ 生产清单打印
- ✅ 自动备份系统
- ✅ 响应式界面设计
- ✅ Docker容器化支持

### 近期更新
- 🔄 2025-12-13: 修复Git备份系统
- 🔄 2025-12-12: 优化ARM平台支持
- 🔄 2025-11-28: 完善生产清单功能

## 📞 技术支持

### 开发文档
- [前端开发文档](config/前端开发文档.md)
- [备份系统文档](backups/README.md)
- [技术实现笔记](config/技术实现)

### 问题反馈
如遇到问题，请检查：
1. 系统日志文件
2. 备份日志记录
3. GitHub Issues

## 📄 许可证

本项目采用 MIT 许可证，详情请查看 LICENSE 文件。

---

**系统状态**: 🟢 正常运行
**最后更新**: 2025-12-13
**维护状态**: 活跃维护

> 花馍订单管理系统 - 让传统手工艺与现代技术完美结合