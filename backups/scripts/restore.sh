#!/bin/bash

# 花馍订单系统数据库恢复脚本
# 作者: Claude Code
# 功能: 从GitHub备份仓库恢复数据库

set -euo pipefail

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT"
LOG_DIR="$BACKUP_DIR/logs"
TEMP_DIR="$BACKUP_DIR/temp"

# 数据库路径
DB_PATH="$PROJECT_ROOT/../backend/database.db"
DB_NAME="database.db"

# GitHub配置
GITHUB_REPO="grayblur/order-system-database-backups"
GITHUB_API_BASE="https://api.github.com/repos"

# 日志配置
LOG_FILE="$LOG_DIR/restore_$(date +%Y-%m-%d).log"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 创建必要目录
mkdir -p "$LOG_DIR" "$TEMP_DIR"

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# 错误处理
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        error "恢复失败，退出码: $exit_code"
    fi
    rm -rf "$TEMP_DIR" 2>/dev/null || true
    exit $exit_code
}

trap cleanup EXIT

# 显示帮助信息
show_help() {
    echo "花馍订单系统数据库恢复脚本"
    echo ""
    echo "用法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -l, --list            列出可用的备份文件"
    echo "  -r, --restore DATE    恢复指定日期的备份 (格式: YYYY-MM-DD)"
    echo "  -l, --latest          恢复最新的备份"
    echo "  -b, --backup FILE     恢复指定的备份文件"
    echo "  -h, --help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 --list                     # 列出所有备份"
    echo "  $0 --latest                   # 恢复最新备份"
    echo "  $0 --restore 2025-12-12       # 恢复2025-12-12的备份"
    echo "  $0 --backup 2025-12-12_10-30-00_database.db.gz  # 恢复指定文件"
}

# 检查依赖
check_dependencies() {
    local missing_tools=()

    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi

    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi

    if ! command -v gunzip &> /dev/null; then
        missing_tools+=("gunzip")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "缺少必要工具: ${missing_tools[*]}"
        exit 1
    fi

    log "依赖检查通过"
}

# 克隆备份仓库
clone_backup_repo() {
    local git_dir="$TEMP_DIR/repo"
    mkdir -p "$git_dir"

    info "克隆备份仓库..."
    cd "$git_dir"

    local clone_url="https://github.com/$GITHUB_REPO.git"
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        clone_url="https://${GITHUB_TOKEN}@github.com/$GITHUB_REPO.git"
    fi

    git clone "$clone_url" . 2>/dev/null || {
        error "克隆备份仓库失败"
        exit 1
    }

    log "备份仓库克隆成功"
}

# 列出可用备份
list_backups() {
    info "获取可用备份列表..."

    clone_backup_repo
    cd "$TEMP_DIR/repo"

    if [ ! -d "database" ]; then
        error "数据库目录不存在"
        exit 1
    fi

    echo ""
    echo "可用备份文件:"
    echo "============="
    local count=0
    for file in database/*${DB_NAME}*; do
        if [ -f "$file" ]; then
            count=$((count + 1))
            local filename=$(basename "$file")
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
            local size_kb=$((size / 1024))
            local date=$(basename "$file" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}' | head -1 | sed 's/_/ /')

            printf "%3d. %-40s %8sKB  %s\n" "$count" "$filename" "$size_kb" "$date"
        fi
    done

    if [ $count -eq 0 ]; then
        warn "没有找到备份文件"
        return 1
    else
        echo ""
        log "共找到 $count 个备份文件"
        return 0
    fi
}

# 获取最新备份
get_latest_backup() {
    clone_backup_repo
    cd "$TEMP_DIR/repo/database"

    local latest_file=$(ls -t *${DB_NAME}* 2>/dev/null | head -1)
    if [ -z "$latest_file" ]; then
        error "没有找到备份文件"
        exit 1
    fi

    echo "$latest_file"
}

# 查找指定日期的备份
find_backup_by_date() {
    local target_date="$1"
    clone_backup_repo
    cd "$TEMP_DIR/repo/database"

    # 查找匹配指定日期的备份
    local backup_file=$(ls *${DB_NAME}* 2>/dev/null | grep "$target_date" | head -1)
    if [ -z "$backup_file" ]; then
        error "没有找到日期为 $target_date 的备份文件"
        exit 1
    fi

    echo "$backup_file"
}

# 恢复数据库
restore_database() {
    local backup_file="$1"
    local backup_path="$TEMP_DIR/repo/database/$backup_file"

    if [ ! -f "$backup_path" ]; then
        error "备份文件不存在: $backup_file"
        exit 1
    fi

    info "开始恢复数据库..."
    info "备份文件: $backup_file"

    # 创建当前数据库的备份
    if [ -f "$DB_PATH" ]; then
        local current_backup="$DB_PATH.backup_$(date +%Y%m%d_%H%M%S)"
        info "创建当前数据库备份: $current_backup"
        cp "$DB_PATH" "$current_backup"
    fi

    # 解压备份文件（如果是压缩的）
    local temp_restore_file="$TEMP_DIR/restore_$DB_NAME"
    if [[ "$backup_file" == *.gz ]]; then
        info "解压备份文件..."
        gunzip -c "$backup_path" > "$temp_restore_file"
    else
        cp "$backup_path" "$temp_restore_file"
    fi

    # 验证恢复文件
    if ! dd if="$temp_restore_file" bs=16 count=1 2>/dev/null | grep -q "SQLite format 3"; then
        error "恢复文件格式无效"
        exit 1
    fi

    # 检查当前数据库是否正在使用
    if [ -f "$DB_PATH" ]; then
        # 检查是否有进程正在使用数据库
        local db_locked=false
        if command -v lsof &> /dev/null; then
            if lsof "$DB_PATH" &>/dev/null; then
                warn "检测到数据库文件正在被使用"
                db_locked=true
            fi
        fi

        if [ "$db_locked" = true ]; then
            warn "建议先停止应用程序再进行恢复操作"
            read -p "是否继续恢复? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                info "恢复操作已取消"
                exit 0
            fi
        fi
    fi

    # 执行恢复
    info "恢复数据库文件..."
    cp "$temp_restore_file" "$DB_PATH"

    # 设置正确的权限
    chmod 644 "$DB_PATH"

    # 验证恢复的数据库
    info "验证恢复的数据库..."
    if dd if="$DB_PATH" bs=16 count=1 2>/dev/null | grep -q "SQLite format 3"; then
        log "数据库恢复成功"
        info "恢复的数据库文件: $DB_PATH"
        info "文件大小: $(stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH" 2>/dev/null) bytes"
    else
        error "数据库验证失败"
        exit 1
    fi

    # 提醒重启应用
    if [ "$db_locked" = true ]; then
        warn "请重启应用程序以使用恢复的数据库"
    fi
}

# 主函数
main() {
    local action=""
    local target_date=""
    local backup_file=""

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--list)
                action="list"
                shift
                ;;
            -r|--restore)
                action="restore"
                target_date="$2"
                shift 2
                ;;
            --latest)
                action="latest"
                shift
                ;;
            -b|--backup)
                action="backup"
                backup_file="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 如果没有指定操作，显示帮助
    if [ -z "$action" ]; then
        show_help
        exit 1
    fi

    log "===== 数据库恢复操作 ====="
    log "操作时间: $(date '+%Y-%m-%d %H:%M:%S')"
    log "数据库路径: $DB_PATH"

    # 检查依赖
    check_dependencies

    # 执行相应操作
    case $action in
        list)
            list_backups
            ;;
        latest)
            local latest
            latest=$(get_latest_backup)
            restore_database "$latest"
            ;;
        restore)
            if [ -z "$target_date" ]; then
                error "请指定恢复日期"
                show_help
                exit 1
            fi
            local found_backup
            found_backup=$(find_backup_by_date "$target_date")
            restore_database "$found_backup"
            ;;
        backup)
            if [ -z "$backup_file" ]; then
                error "请指定备份文件名"
                show_help
                exit 1
            fi
            restore_database "$backup_file"
            ;;
    esac

    log "===== 操作完成 ====="
}

# 执行主函数
main "$@"