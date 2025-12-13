# GitHub Actions 自动备份配置

## 1. 在备份仓库中创建 GitHub Actions 工作流

在 `order-system-database-backups` 仓库中创建以下文件：

### `.github/workflows/cleanup.yml`

```yaml
name: 清理过期备份

on:
  schedule:
    # 每周日凌晨3点执行清理
    - cron: '0 3 * * 0'
  workflow_dispatch:  # 允许手动触发

jobs:
  cleanup:
    runs-on: ubuntu-latest

    steps:
    - name: 检出代码
      uses: actions/checkout@v4
      with:
        token: ${{ secrets.GITHUB_TOKEN }}

    - name: 配置Git
      run: |
        git config --global user.name "Cleanup Bot"
        git config --global user.email "cleanup@order-system.local"

    - name: 清理过期备份
      env:
        RETENTION_DAYS: 30
      run: |
        # 找到超过保留天数的文件
        cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        echo "清理 $cutoff_date 之前的备份文件"

        deleted_files=()
        for file in database/*; do
          if [ -f "$file" ]; then
            file_date=$(basename "$file" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)
            if [ "$file_date" != "" ] && [ "$file_date" \< "$cutoff_date" ]; then
              echo "删除过期文件: $(basename "$file")"
              git rm "$file"
              deleted_files+=("$(basename "$file")")
            fi
          fi
        done

        if [ ${#deleted_files[@]} -gt 0 ]; then
          git commit -m "自动清理过期备份

删除时间: $(date '+%Y-%m-%d %H:%M:%S')
文件数量: ${#deleted_files[@]}
保留天数: $RETENTION_DAYS

由GitHub Actions自动执行"

          git push
        else
          echo "没有需要清理的过期文件"
        fi
```

### `.github/workflows/backup-stats.yml`

```yaml
name: 备份统计

on:
  schedule:
    # 每天早上8点统计
    - cron: '0 8 * * *'
  workflow_dispatch:

jobs:
  stats:
    runs-on: ubuntu-latest

    steps:
    - name: 检出代码
      uses: actions/checkout@v4

    - name: 统计备份信息
      run: |
        echo "## 备份统计信息" > stats.md
        echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')" >> stats.md
        echo "" >> stats.md

        # 统计备份文件数量
        backup_count=$(ls database/* 2>/dev/null | wc -l)
        echo "- 备份文件总数: $backup_count" >> stats.md

        # 计算总大小
        if [ $backup_count -gt 0 ]; then
          total_size=$(du -sh database | cut -f1)
          echo "- 总大小: $total_size" >> stats.md

          # 最新备份
          latest_file=$(ls -t database/* | head -1)
          echo "- 最新备份: $(basename "$latest_file")" >> stats.md
          echo "- 最新备份大小: $(du -h "$latest_file" | cut -f1)" >> stats.md

          # 最旧备份
          oldest_file=$(ls -tr database/* | head -1)
          echo "- 最旧备份: $(basename "$oldest_file")" >> stats.md
        fi

        echo "" >> stats.md
        echo "### 所有备份文件" >> stats.md
        echo "" >> stats.md

        # 列出所有备份文件
        for file in database/*; do
          if [ -f "$file" ]; then
            size=$(du -h "$file" | cut -f1)
            echo "- $(basename "$file") ($size)" >> stats.md
          fi
        done

    - name: 创建统计Issue
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const stats = fs.readFileSync('stats.md', 'utf8');

          github.rest.issues.create({
            owner: context.repo.owner,
            repo: context.repo.repo,
            title: `备份统计 - ${new Date().toISOString().split('T')[0]}`,
            body: stats,
            labels: ['stats', 'automated']
          });
```

## 2. 设置GitHub Token

在本地设置环境变量：

```bash
# 临时设置（当前会话有效）
export GITHUB_TOKEN="your_personal_access_token"

# 永久设置（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'export GITHUB_TOKEN="your_personal_access_token"' >> ~/.bashrc
source ~/.bashrc
```

## 3. 创建个人访问令牌

1. 访问 GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. 生成新令牌，权限包括：
   - `repo` (完整仓库访问权限)
   - `workflow` (GitHub Actions权限)

## 4. 测试配置

测试备份脚本是否正常工作：

```bash
# 测试备份
./backups/scripts/backup.sh

# 测试恢复（列出备份）
./backups/scripts/restore.sh --list

# 查看日志
ls -la backups/logs/
cat backups/logs/backup_$(date +%Y-%m-%d).log
```