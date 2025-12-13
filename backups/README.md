# 花馍订单系统数据库备份系统

这是一个全自动的数据库备份解决方案，用于花馍订单系统的SQLite数据库自动备份到GitHub仓库。

## 🚀 功能特性

- **自动备份**: 每天凌晨2点自动备份数据库
- **压缩存储**: 使用gzip压缩，节省存储空间
- **版本管理**: 保留最近30天的备份历史
- **完整性验证**: 备份前后自动验证数据库完整性
- **错误处理**: 完善的错误处理和日志记录
- **一键恢复**: 支持快速恢复任意历史备份
- **GitHub集成**: 使用GitHub作为安全可靠的备份存储
- **智能清理**: 自动清理过期备份，节省存储空间

## 📁 目录结构

```
backups/
├── scripts/                # 脚本目录
│   ├── backup.sh          # 自动备份脚本
│   ├── restore.sh         # 数据库恢复脚本
│   ├── setup.sh           # 一键安装脚本
│   ├── setup-crontab.md   # 定时任务配置指南
│   └── setup-github-actions.md # GitHub Actions配置
├── logs/                  # 日志目录
├── temp/                  # 临时文件目录
└── README.md              # 本文档
```

## 🛠️ 快速开始

### 方法一：一键安装（推荐）

```bash
# 运行一键安装脚本
./backups/scripts/setup.sh
```

安装脚本会自动：
- 检查系统依赖
- 配置GitHub Token
- 设置定时任务
- 测试备份功能
- 显示配置信息

### 方法二：手动安装

#### 1. 配置GitHub Token

```bash
# 创建GitHub Personal Access Token（需要repo权限）
export GITHUB_TOKEN="your_personal_access_token"

# 永久设置
echo 'export GITHUB_TOKEN="your_personal_access_token"' >> ~/.bashrc
source ~/.bashrc
```

#### 2. 设置定时任务

```bash
# 编辑定时任务
crontab -e
```

添加以下内容：
```bash
# 花馍订单系统数据库自动备份
# 每天凌晨2点执行备份
0 2 * * * /home/zle/code/order-system/backups/scripts/backup.sh

# 每周日凌晨3点清理过期日志
0 3 * * 0 find /home/zle/code/order-system/backups/logs -name "*.log" -mtime +7 -delete
```

#### 3. 测试备份

```bash
# 手动执行备份测试
./backups/scripts/backup.sh

# 查看备份日志
cat backups/logs/backup_$(date +%Y-%m-%d).log
```

## 📋 使用说明

### 备份数据库

#### 自动备份
系统会在每天凌晨2点自动执行备份，无需手动干预。

#### 手动备份
```bash
# 立即执行备份
./backups/scripts/backup.sh
```

### 恢复数据库

#### 查看可用备份
```bash
# 列出所有备份文件
./backups/scripts/restore.sh --list
```

#### 恢复最新备份
```bash
# 恢复最新的备份文件
./backups/scripts/restore.sh --latest
```

#### 恢复指定日期的备份
```bash
# 恢复指定日期的备份
./backups/scripts/restore.sh --restore 2025-12-12
```

#### 恢复指定备份文件
```bash
# 恢复指定的备份文件
./backups/scripts/restore.sh --backup 2025-12-12_10-30-00_database.db.gz
```

## 📊 监控和维护

### 查看日志

```bash
# 查看今天的备份日志
cat backups/logs/backup_$(date +%Y-%m-%d).log

# 查看所有日志文件
ls -la backups/logs/

# 实时监控日志
tail -f backups/logs/backup_$(date +%Y-%m-%d).log
```

### 检查定时任务

```bash
# 查看当前定时任务
crontab -l

# 检查cron服务状态
sudo systemctl status cron
```

### 备份仓库

- **备份仓库地址**: https://github.com/grayblur/order-system-database-backups
- **备份文件路径**: `database/` 目录
- **自动清理**: 保留最近30天的备份

## 🔧 配置选项

### 备份脚本配置

在 `backup.sh` 中可以修改以下配置：

```bash
# 备份保留天数
BACKUP_RETENTION_DAYS=30

# 最大备份文件大小（MB）
MAX_BACKUP_SIZE_MB=50

# 是否启用压缩
COMPRESS=true

# 是否验证备份文件
VERIFY_BACKUP=true
```

### 数据库路径

```bash
# 数据库文件路径
DB_PATH="/home/zle/code/order-system/backend/database.db"
```

## 🚨 注意事项

### 备份前
1. 确保数据库文件路径正确
2. 确保有足够的磁盘空间
3. 确保网络连接正常
4. 确保GitHub Token有效

### 恢复前
1. **重要**：先停止应用程序服务
2. 确认要恢复的备份文件
3. 备份当前数据库（脚本会自动备份）
4. 恢复完成后重启应用程序

### 安全建议
1. 定期检查GitHub Token有效性
2. 定期查看备份日志
3. 重要操作前手动备份
4. 备份仓库设置为私有
5. 定期测试恢复功能

## 🐛 故障排除

### 常见问题

#### 1. 备份失败
```bash
# 检查脚本权限
ls -la backups/scripts/backup.sh

# 检查数据库文件
ls -la backend/database.db

# 查看详细错误日志
cat backups/logs/backup_$(date +%Y-%m-%d).log
```

#### 2. GitHub连接失败
```bash
# 测试GitHub连接
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# 检查Token权限
# 确保Token具有repo权限
```

#### 3. 定时任务不执行
```bash
# 检查cron服务
sudo systemctl status cron

# 启动cron服务
sudo systemctl start cron

# 查看cron日志
sudo grep CRON /var/log/syslog
```

#### 4. 恢复失败
```bash
# 确保应用程序已停止
# 检查备份文件完整性
gunzip -t backup_file.gz

# 检查文件权限
ls -la backend/database.db
```

### 调试模式

```bash
# 启用详细日志
set -x  # 在脚本开头添加

# 手动执行调试
./backups/scripts/backup.sh -x
```

## 📈 性能优化

### 备份优化
- 使用压缩减少网络传输时间
- 本地完整性检查避免传输错误文件
- 智能缓存减少重复操作

### 存储优化
- 自动清理过期备份
- 压缩存储节省空间
- 增量备份（未来版本）

## 🔄 版本历史

- **v1.1.0** (2025-12-13)
  - ✅ 修复日志输出污染问题
  - ✅ 启用GitHub自动上传
  - ✅ 优化函数返回值处理
  - ✅ 完善错误处理机制
  - ✅ 验证系统稳定运行

- **v1.0.0** (2025-12-12)
  - 基础备份功能
  - 自动定时任务
  - GitHub集成
  - 数据库恢复功能
  - 完整的错误处理和日志

## 📊 当前状态

**系统版本**: v1.1.0
**最后更新**: 2025-12-13 09:48
**运行状态**: 🟢 正常运行
**备份仓库**: https://github.com/grayblur/order-system-database-backups
**最新备份**: `2025-12-13_09-48-21_database.db.gz`

### 已知问题
- ✅ 所有已知问题已修复

### 技术改进
- 函数返回值处理优化
- 日志输出重定向到stderr
- GitHub上传功能稳定运行
- 自动清理过期备份

## 📞 支持

如果遇到问题，请：

1. 查看日志文件确定错误原因
2. 检查本文档的故障排除部分
3. 确认所有依赖项都正确安装
4. 验证GitHub Token和网络连接

## 📄 许可证

本备份系统遵循与主项目相同的许可证。