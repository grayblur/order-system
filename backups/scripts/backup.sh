#!/bin/bash

# 花馍订单系统数据库自动备份脚本
# 作者: Claude Code
# 功能: 自动备份数据库到GitHub仓库

set -euo pipefail  # 出错立即退出

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT"
LOG_DIR="$BACKUP_DIR/logs"
TEMP_DIR="$BACKUP_DIR/temp"

# 数据库路径
DB_PATH="$PROJECT_ROOT/../backend/database.db"
DB_NAME="database.db"

# 如果路径不存在，尝试其他可能的位置
if [ ! -f "$DB_PATH" ]; then
    if [ -f "$PROJECT_ROOT/../database.db" ]; then
        DB_PATH="$PROJECT_ROOT/../database.db"
    elif [ -f "$PROJECT_ROOT/../../backend/database.db" ]; then
        DB_PATH="$PROJECT_ROOT/../../backend/database.db"
    elif [ -f "$PROJECT_ROOT/../../database.db" ]; then
        DB_PATH="$PROJECT_ROOT/../../database.db"
    fi
fi

# GitHub配置
GITHUB_REPO="grayblur/order-system-database-backups"
GITHUB_API_BASE="https://api.github.com/repos"

# 备份配置
BACKUP_RETENTION_DAYS=30
MAX_BACKUP_SIZE_MB=50
COMPRESS=true
VERIFY_BACKUP=true

# 日志配置
LOG_FILE="$LOG_DIR/backup_$(date +%Y-%m-%d).log"
BACKUP_DATE=$(date +%Y-%m-%d_%H-%M-%S)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 创建必要目录
mkdir -p "$LOG_DIR" "$TEMP_DIR"

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE" >&2
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE" >&2
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE" >&2
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE" >&2
}

# 错误处理
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        error "备份失败，退出码: $exit_code"
    fi
    # 清理临时文件
    rm -rf "$TEMP_DIR" 2>/dev/null || true
    exit $exit_code
}

trap cleanup EXIT

# 检查必要工具
check_dependencies() {
    local missing_tools=()

    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi

    if ! command -v gzip &> /dev/null; then
        missing_tools+=("gzip")
    fi

    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "缺少必要工具: ${missing_tools[*]}"
        error "请安装这些工具后重新运行"
        exit 1
    fi

    log "必要工具检查通过"
}

# 检查环境变量
check_environment() {
    if [ ! -f "$DB_PATH" ]; then
        error "数据库文件不存在: $DB_PATH"
        exit 1
    fi

    # 检查GitHub token
    if [ -z "${GITHUB_TOKEN:-}" ]; then
        warn "未设置GITHUB_TOKEN环境变量，尝试使用git credential helper"
    fi

    log "环境检查通过"
}

# 数据库完整性检查
verify_database() {
    info "开始数据库完整性检查..."

    # 检查文件大小
    local db_size=$(stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH" 2>/dev/null)
    if [ "$db_size" -eq 0 ]; then
        error "数据库文件为空"
        exit 1
    fi

    # 检查SQLite格式
    if ! dd if="$DB_PATH" bs=16 count=1 2>/dev/null | grep -q "SQLite format 3"; then
        error "数据库格式无效"
        exit 1
    fi

    log "数据库完整性检查通过，文件大小: $(( db_size / 1024 ))KB"
}

# 创建备份
create_backup() {
    info "开始创建数据库备份..."
    info "数据库路径: $DB_PATH"
    info "临时目录: $TEMP_DIR"

    local backup_filename="${BACKUP_DATE}_${DB_NAME}"
    local backup_path="$TEMP_DIR/$backup_filename"
    info "备份文件路径: $backup_path"

    # 确保临时目录存在
    mkdir -p "$TEMP_DIR"

    # 复制数据库文件
    cp "$DB_PATH" "$backup_path" || {
        error "数据库文件复制失败: 从 $DB_PATH 到 $backup_path"
        exit 1
    }

    # 验证复制
    if ! cmp -s "$DB_PATH" "$backup_path"; then
        error "数据库文件验证失败"
        exit 1
    fi

    # 压缩备份
    if [ "$COMPRESS" = true ]; then
        info "正在压缩备份文件..."
        gzip -c "$backup_path" > "$backup_path.gz"
        rm "$backup_path"
        backup_path="$backup_path.gz"
    fi

    # 验证备份文件
    if [ "$VERIFY_BACKUP" = true ]; then
        if [ "$COMPRESS" = true ]; then
            gunzip -t "$backup_path"
        else
            # 对于未压缩文件，检查SQLite格式
            dd if="$backup_path" bs=16 count=1 2>/dev/null | grep -q "SQLite format 3"
        fi
    fi

    # 检查备份文件大小
    local backup_size=$(stat -f%z "$backup_path" 2>/dev/null || stat -c%s "$backup_path" 2>/dev/null)
    local backup_size_mb=$(( backup_size / 1024 / 1024 ))

    if [ "$backup_size_mb" -gt "$MAX_BACKUP_SIZE_MB" ]; then
        error "备份文件过大: ${backup_size_mb}MB (限制: ${MAX_BACKUP_SIZE_MB}MB)"
        exit 1
    fi

    log "备份创建成功: $backup_filename (大小: ${backup_size_mb}MB)"
    printf "%s\n" "$backup_path"
}

# 上传到GitHub
upload_to_github() {
    local backup_file="$1"
    local backup_filename=$(basename "$backup_file")

    info "开始上传备份到GitHub..."

    # 创建临时目录用于Git操作
    local git_dir="$TEMP_DIR/repo"
    mkdir -p "$git_dir"

    # 克隆仓库
    info "克隆备份仓库..."
    cd "$git_dir"

    local clone_url="https://github.com/$GITHUB_REPO.git"
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        clone_url="https://${GITHUB_TOKEN}@github.com/$GITHUB_REPO.git"
    fi

    git clone "$clone_url" . 2>/dev/null || {
        error "克隆仓库失败"
        exit 1
    }

    # 创建数据库目录
    mkdir -p database

    # 复制备份文件
    cp "$backup_file" "database/$backup_filename"

    # 配置Git信息
    git config user.name "Backup Bot"
    git config user.email "backup@order-system.local"

    # 添加并提交文件
    git add "database/$backup_filename"
    git commit -m "自动备份: $backup_filename

备份时间: $(date '+%Y-%m-%d %H:%M:%S')
文件大小: $(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null) bytes
系统: $(uname -s) $(uname -r)

此备份由自动化脚本生成" 2>/dev/null || {
        warn "没有新文件需要提交"
        return 0
    }

    # 推送到GitHub
    info "推送到GitHub..."
    git push origin main 2>/dev/null || {
        error "推送到GitHub失败"
        exit 1
    }

    log "备份上传成功: $backup_filename"
}

# 清理过期备份
cleanup_old_backups() {
    info "开始清理过期备份..."

    local git_dir="$TEMP_DIR/repo"
    cd "$git_dir"

    # 获取过期备份文件列表
    local cutoff_date=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%Y-%m-%d 2>/dev/null || date -v-"$BACKUP_RETENTION_DAYS"d +%Y-%m-%d)
    local old_files=()

    # 查找过期文件
    for file in database/*${DB_NAME}*; do
        if [ -f "$file" ]; then
            local file_date=$(basename "$file" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)
            if [ "$file_date" != "" ] && [ "$file_date" \< "$cutoff_date" ]; then
                old_files+=("$file")
            fi
        fi
    done

    # 删除过期文件
    if [ ${#old_files[@]} -gt 0 ]; then
        info "发现 ${#old_files[@]} 个过期备份文件"

        for old_file in "${old_files[@]}"; do
            info "删除过期备份: $(basename "$old_file")"
            git rm "$old_file" 2>/dev/null || true
        done

        # 提交删除操作
        git commit -m "清理过期备份文件

删除时间: $(date '+%Y-%m-%d %H:%M:%S')
文件数量: ${#old_files[@]}
保留天数: $BACKUP_RETENTION_DAYS

此操作由自动化脚本执行" 2>/dev/null || {
            warn "清理过期文件时提交失败"
            return 0
        }

        # 推送删除操作
        git push origin main 2>/dev/null || {
            warn "推送清理操作失败，但本地文件已删除"
        }

        log "过期备份清理完成，删除了 ${#old_files[@]} 个文件"
    else
        log "没有发现需要清理的过期备份"
    fi
}

# 发送通知
send_notification() {
    local status="$1"
    local message="$2"

    # 这里可以扩展为发送邮件、钉钉、企业微信等通知
    if [ "$status" = "success" ]; then
        log "备份完成: $message"
    else
        error "备份失败: $message"
    fi
}

# 主函数
main() {
    log "===== 开始数据库备份 ====="
    log "备份时间: $(date '+%Y-%m-%d %H:%M:%S')"
    log "数据库路径: $DB_PATH"
    log "备份仓库: $GITHUB_REPO"

    # 检查依赖和环境
    check_dependencies
    check_environment

    # 数据库完整性检查
    verify_database

    # 创建备份
    local backup_file
    backup_file=$(create_backup)

    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        error "备份文件创建失败"
        exit 1
    fi

    # 上传到GitHub
    upload_to_github "$backup_file"

    # 清理过期备份
    cleanup_old_backups

    log "===== 备份完成 ====="
    send_notification "success" "数据库备份成功完成"
}

# 执行主函数
main "$@"