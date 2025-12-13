#!/bin/bash

# 花馍订单系统备份系统快速设置脚本
# 作者: Claude Code
# 功能: 一键配置数据库自动备份系统

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[错误]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

# 项目路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 检查权限
check_permissions() {
    if [ "$EUID" -eq 0 ]; then
        error "请不要使用 root 用户运行此脚本"
        exit 1
    fi

    # 检查脚本目录权限
    if [ ! -w "$PROJECT_ROOT/backups" ]; then
        error "没有备份目录的写入权限"
        exit 1
    fi

    log "权限检查通过"
}

# 检查必要工具
check_tools() {
    local missing_tools=()

    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi

    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi

    if ! command -v crontab &> /dev/null; then
        missing_tools+=("crontab")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "缺少必要工具: ${missing_tools[*]}"
        info "请先安装这些工具: sudo apt install git curl cron"
        exit 1
    fi

    log "工具检查通过"
}

# 设置 GitHub Token
setup_github_token() {
    echo ""
    info "设置 GitHub Personal Access Token"
    warn "请确保您已创建了具有 'repo' 权限的 GitHub Personal Access Token"

    if [ -n "${GITHUB_TOKEN:-}" ]; then
        info "检测到已设置的 GITHUB_TOKEN"
        read -p "是否要重新设置? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi

    read -p "请输入您的 GitHub Personal Access Token: " -s token
    echo

    if [ -z "$token" ]; then
        warn "未输入 token，将稍后手动配置"
        return 0
    fi

    # 添加到 bashrc
    if ! grep -q "GITHUB_TOKEN=" ~/.bashrc; then
        echo "" >> ~/.bashrc
        echo "# 花馍订单系统备份配置" >> ~/.bashrc
        echo "export GITHUB_TOKEN=\"$token\"" >> ~/.bashrc
    else
        sed -i "s/export GITHUB_TOKEN=.*/export GITHUB_TOKEN=\"$token\"/" ~/.bashrc
    fi

    # 设置当前会话的 token
    export GITHUB_TOKEN="$token"

    log "GitHub Token 配置完成"
}

# 设置定时任务
setup_crontab() {
    info "配置定时任务..."

    local backup_script="$PROJECT_ROOT/backups/scripts/backup.sh"
    local log_cleanup_cmd="find $PROJECT_ROOT/backups/logs -name \"*.log\" -mtime +7 -delete"

    # 创建 crontab 条目
    local crontab_entry="# 花馍订单系统数据库自动备份
# 每天凌晨2点执行备份
0 2 * * * $backup_script

# 每周日凌晨3点清理日志文件
0 3 * * 0 $log_cleanup_cmd"

    # 检查是否已存在相同配置
    if crontab -l 2>/dev/null | grep -q "花馍订单系统数据库自动备份"; then
        warn "检测到已存在的备份定时任务"
        read -p "是否要覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "保持现有定时任务配置"
            return 0
        fi

        # 删除现有条目
        crontab -l 2>/dev/null | grep -v "花馍订单系统" | crontab -
    fi

    # 添加新的定时任务
    (crontab -l 2>/dev/null; echo "$crontab_entry") | crontab -

    log "定时任务配置完成"
}

# 创建日志目录
setup_log_directory() {
    local log_dir="$PROJECT_ROOT/backups/logs"
    mkdir -p "$log_dir"

    # 创建日志轮转配置
    local logrotate_config="$PROJECT_ROOT/backups/logrotate.conf"
    cat > "$logrotate_config" << EOF
$log_dir/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
}
EOF

    info "日志目录配置完成"
}

# 测试备份功能
test_backup() {
    info "测试备份功能..."

    # 检查数据库文件是否存在
    local db_path="$PROJECT_ROOT/backend/database.db"
    if [ ! -f "$db_path" ]; then
        error "数据库文件不存在: $db_path"
        exit 1
    fi

    # 执行备份测试
    local backup_script="$PROJECT_ROOT/backups/scripts/backup.sh"

    info "执行备份测试..."
    if "$backup_script"; then
        log "备份测试成功"
    else
        error "备份测试失败"
        exit 1
    fi

    # 检查备份仓库
    info "检查备份仓库..."
    if git ls-remote "https://github.com/grayblur/order-system-database-backups.git" &>/dev/null; then
        log "备份仓库连接正常"
    else
        warn "无法连接到备份仓库，请检查网络和 GitHub Token"
    fi
}

# 显示配置信息
show_config() {
    echo ""
    log "===== 配置完成 ====="
    echo ""
    info "备份脚本位置: $PROJECT_ROOT/backups/scripts/backup.sh"
    info "恢复脚本位置: $PROJECT_ROOT/backups/scripts/restore.sh"
    info "日志目录: $PROJECT_ROOT/backups/logs"
    echo ""
    info "定时任务:"
    echo "- 每天凌晨 2:00 自动备份数据库"
    echo "- 每周日凌晨 3:00 清理过期日志"
    echo ""
    info "备份仓库: https://github.com/grayblur/order-system-database-backups"
    echo ""
    info "常用命令:"
    echo "- 手动备份: $PROJECT_ROOT/backups/scripts/backup.sh"
    echo "- 查看备份: $PROJECT_ROOT/backups/scripts/restore.sh --list"
    echo "- 恢复最新备份: $PROJECT_ROOT/backups/scripts/restore.sh --latest"
    echo "- 查看定时任务: crontab -l"
    echo "- 查看备份日志: cat $PROJECT_ROOT/backups/logs/backup_\$(date +%Y-%m-%d).log"
    echo ""
    warn "注意事项:"
    echo "1. 确保 GitHub Token 有效且具有 'repo' 权限"
    echo "2. 定期检查备份日志确保备份成功"
    echo "3. 重要操作前建议手动备份"
    echo "4. 恢复数据库前请停止应用程序"
}

# 主函数
main() {
    log "开始配置花馍订单系统数据库备份..."
    echo ""

    # 执行配置步骤
    check_permissions
    check_tools
    setup_github_token
    setup_crontab
    setup_log_directory

    echo ""
    read -p "是否要测试备份功能? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        warn "跳过备份测试"
    else
        test_backup
    fi

    show_config
}

# 错误处理
trap 'error "配置过程中发生错误，请检查上面的错误信息"; exit 1' ERR

# 执行主函数
main "$@"