# 定时任务配置指南

## 1. 添加定时任务

### 方法一：使用 crontab -e（推荐）

```bash
# 编辑当前用户的定时任务
crontab -e
```

在文件末尾添加以下内容：

```bash
# 花馍订单系统数据库自动备份
# 每天凌晨2点执行备份
0 2 * * * /home/zle/code/order-system/backups/scripts/backup.sh

# 每周日凌晨3点执行系统清理（可选）
0 3 * * 0 find /home/zle/code/order-system/backups/logs -name "*.log" -mtime +7 -delete
```

### 方法二：直接添加到 crontab

```bash
# 创建临时文件
echo "# 花馍订单系统数据库自动备份
# 每天凌晨2点执行备份
0 2 * * * /home/zle/code/order-system/backups/scripts/backup.sh

# 每周日凌晨3点执行系统清理
0 3 * * 0 find /home/zle/code/order-system/backups/logs -name \"*.log\" -mtime +7 -delete" > /tmp/crontab_addition

# 添加到现有 crontab
crontab -l | cat - /tmp/crontab_addition | crontab -

# 删除临时文件
rm /tmp/crontab_addition
```

## 2. 验证定时任务

```bash
# 查看当前用户的定时任务
crontab -l

# 检查 crond 服务状态（根据系统选择）
sudo systemctl status cron    # Ubuntu/Debian
sudo systemctl status crond   # CentOS/RHEL

# 启动 crond 服务（如果未启动）
sudo systemctl start cron     # Ubuntu/Debian
sudo systemctl start crond    # CentOS/RHEL

# 设置 crond 服务开机启动
sudo systemctl enable cron    # Ubuntu/Debian
sudo systemctl enable crond   # CentOS/RHEL
```

## 3. 测试定时任务

### 手动执行测试
```bash
# 直接执行备份脚本
/home/zle/code/order-system/backups/scripts/backup.sh

# 查看执行日志
tail -f /home/zle/code/order-system/backups/logs/backup_$(date +%Y-%m-%d).log
```

### 定时任务测试
```bash
# 添加一个测试任务，每分钟执行一次
* * * * * /home/zle/code/order-system/backups/scripts/backup.sh

# 等待1-2分钟后查看日志
ls -la /home/zle/code/order-system/backups/logs/
cat /home/zle/code/order-system/backups/logs/backup_$(date +%Y-%m-%d).log

# 测试完成后删除测试任务，使用正常时间表
crontab -e  # 编辑删除测试行
```

## 4. 环境变量设置

定时任务执行环境可能与用户环境不同，建议在脚本中设置必要的环境变量：

```bash
# 在 backup.sh 脚本开头添加
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin"
export HOME="/home/zle"

# 如果需要 GitHub Token，可以：
# 1. 在脚本中直接设置
export GITHUB_TOKEN="your_personal_access_token"

# 2. 或者创建环境变量文件
echo 'export GITHUB_TOKEN="your_personal_access_token"' > ~/.github_env
source ~/.github_env

# 然后在 crontab 中加载环境变量
*/5 * * * * source ~/.github_env && /path/to/script.sh
```

## 5. 日志监控

### 查看执行日志
```bash
# 查看今天的备份日志
cat /home/zle/code/order-system/backups/logs/backup_$(date +%Y-%m-%d).log

# 查看最近的备份日志
ls -la /home/zle/code/order-system/backups/logs/ | tail -5

# 实时监控日志
tail -f /home/zle/code/order-system/backups/logs/backup_$(date +%Y-%m-%d).log
```

### 系统日志
```bash
# 查看 cron 日志（Ubuntu/Debian）
sudo tail -f /var/log/syslog | grep CRON

# 查看 cron 日志（CentOS/RHEL）
sudo tail -f /var/log/cron
```

## 6. 备份监控通知

可以添加邮件通知或其他通知方式：

### 邮件通知示例
```bash
# 在备份脚本最后添加通知逻辑
if [ $backup_success = true ]; then
    echo "数据库备份成功完成" | mail -s "备份成功通知" your-email@example.com
else
    echo "数据库备份失败，请检查日志" | mail -s "备份失败通知" your-email@example.com
fi
```

## 7. 故障排除

### 常见问题
1. **路径问题**：确保使用绝对路径
2. **权限问题**：确保脚本有执行权限
3. **环境变量**：定时任务环境变量可能不同
4. **网络问题**：确保能访问 GitHub

### 调试步骤
```bash
# 1. 手动执行脚本看是否正常
/path/to/script.sh

# 2. 检查脚本权限
ls -la /path/to/script.sh

# 3. 检查 cron 服务状态
sudo systemctl status cron

# 4. 查看 cron 日志
sudo grep CRON /var/log/syslog

# 5. 检查环境变量
env | grep -E "(PATH|GITHUB|HOME)"
```

## 8. 删除定时任务

```bash
# 编辑删除
crontab -e

# 或者完全重新设置
crontab -r  # 删除所有定时任务（谨慎使用）
```