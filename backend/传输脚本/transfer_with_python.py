#!/usr/bin/env python3
import subprocess
import sys
import os

# 配置
SERVER = "root@192.168.0.110"
TARGET_DIR = "/opt/order-system-backend"
PASSWORD = "123456"

def run_command_with_password(cmd, password):
    """使用密码运行命令"""
    process = subprocess.Popen(
        ['sshpass', '-p', password, 'bash', '-c', cmd],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate()
    return process.returncode, stdout, stderr

def main():
    print("开始传输文件到目标服务器...")

    # 创建目标目录
    print("创建目标目录...")
    mkdir_cmd = f'ssh -o StrictHostKeyChecking=no {SERVER} "mkdir -p {TARGET_DIR}"'

    try:
        # 检查sshpass是否可用
        subprocess.run(['which', 'sshpass'], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print("sshpass 未安装，正在尝试安装...")
        # 尝试使用pip安装sshpass或使用其他方法
        print("请先安装sshpass: sudo apt-get install sshpass")
        return 1

    # 创建传输文件列表
    files_to_transfer = [
        "check-payment-status.js",
        "fix-order-13.js",
        "fix-payment-status.js",
        "deploy.sh",
        ".env.production",
        "package.json",
        "Dockerfile.dev",
        "uninstall.sh",
        "test-production.js",
        "test-frontend-loading.js",
        "check-latest-orders.js",
        "simple-server.js",
        "production-server.js",
        "README-DEPLOYMENT.md",
        ".gitignore",
        "create-test-orders.js",
        ".env",
        "package-lock.json",
        "server.js",
        "test-server.js",
        "stable-server.js",
        "test-order-flow.js"
    ]

    dirs_to_transfer = ["models", "routes", "services", "utils", "resources"]

    # 使用rsync传输，排除不需要的文件
    rsync_cmd = f"""rsync -avz --exclude='database.db*' --exclude='node_modules' --exclude='.claude' --exclude='*.pid' --exclude='*.log' --exclude='temp' --exclude='logs' --exclude='backups' --exclude='transfer_*' . {SERVER}:{TARGET_DIR}/"""

    print("执行文件传输...")
    returncode, stdout, stderr = run_command_with_password(rsync_cmd, PASSWORD)

    if returncode == 0:
        print("文件传输成功!")
        if stdout:
            print("输出:", stdout)
    else:
        print(f"传输失败，返回码: {returncode}")
        print("错误:", stderr)

        # 如果rsync失败，尝试逐个传输文件
        print("尝试逐个传输文件...")
        for file in files_to_transfer:
            if os.path.exists(file):
                scp_cmd = f'scp -o StrictHostKeyChecking=no "{file}" {SERVER}:{TARGET_DIR}/'
                returncode, stdout, stderr = run_command_with_password(scp_cmd, PASSWORD)
                if returncode == 0:
                    print(f"✓ 传输成功: {file}")
                else:
                    print(f"✗ 传输失败: {file} - {stderr}")

        for dir_name in dirs_to_transfer:
            if os.path.exists(dir_name):
                scp_cmd = f'scp -r -o StrictHostKeyChecking=no "{dir_name}" {SERVER}:{TARGET_DIR}/'
                returncode, stdout, stderr = run_command_with_password(scp_cmd, PASSWORD)
                if returncode == 0:
                    print(f"✓ 传输成功: {dir_name}")
                else:
                    print(f"✗ 传输失败: {dir_name} - {stderr}")

    return 0

if __name__ == "__main__":
    sys.exit(main())