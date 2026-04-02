#!/usr/bin/env python3
"""
PythonAnywhere 部署脚本
用于在 PythonAnywhere Bash 控制台运行，自动更新代码
"""

import os
import subprocess
import sys

def run_command(cmd, cwd=None):
    """运行命令并打印输出"""
    print(f">>> 运行: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode == 0

def main():
    # 查找项目目录
    home = os.path.expanduser("~")
    print(f"Home 目录: {home}")
    
    # 列出所有目录
    print("\n>>> 查找项目目录...")
    for item in os.listdir(home):
        full_path = os.path.join(home, item)
        if os.path.isdir(full_path):
            print(f"  目录: {item}")
            # 检查是否是项目目录
            if 'backend' in item.lower() or 'flask' in item.lower():
                print(f"    -> 找到可能的目录: {full_path}")
    
    # 检查常见的项目路径
    possible_paths = [
        os.path.join(home, 'rider-management-system'),
        os.path.join(home, 'backend_flask'),
        os.path.join(home, 'backend'),
        os.path.join(home, 'mysite'),
    ]
    
    project_path = None
    for path in possible_paths:
        if os.path.exists(path):
            print(f"\n>>> 找到目录: {path}")
            # 检查是否有 app.py
            if os.path.exists(os.path.join(path, 'app.py')):
                project_path = path
                print(f"    -> 确认项目目录: {path}")
                break
            # 检查是否有 backend_flask 子目录
            backend_path = os.path.join(path, 'backend_flask')
            if os.path.exists(backend_path) and os.path.exists(os.path.join(backend_path, 'app.py')):
                project_path = backend_path
                print(f"    -> 确认项目目录: {backend_path}")
                break
    
    if not project_path:
        print("\n❌ 错误: 找不到项目目录")
        print("请手动检查目录结构，或使用方案二直接编辑文件")
        return False
    
    print(f"\n>>> 项目目录: {project_path}")
    
    # 检查是否是 Git 仓库
    git_dir = os.path.join(project_path, '.git')
    if os.path.exists(git_dir):
        print(">>> 是 Git 仓库，尝试拉取最新代码...")
        if run_command('git pull origin main', cwd=project_path):
            print("✅ 代码更新成功")
        else:
            print("⚠️ Git 拉取失败，尝试强制更新...")
            run_command('git fetch origin main', cwd=project_path)
            run_command('git reset --hard origin/main', cwd=project_path)
    else:
        print(">>> 不是 Git 仓库，需要手动更新文件")
        print("请使用方案二：直接在 Files 界面编辑 app.py")
    
    # 检查 app.py 是否存在
    app_py = os.path.join(project_path, 'app.py')
    if os.path.exists(app_py):
        print(f"\n>>> 找到 app.py: {app_py}")
        # 显示文件前30行
        print(">>> 当前 app.py 前30行:")
        with open(app_py, 'r', encoding='utf-8') as f:
            lines = f.readlines()[:30]
            for i, line in enumerate(lines, 1):
                print(f"{i:3}: {line}", end='')
    
    print("\n\n>>> 部署完成！")
    print("请去 Web 标签页点击 Reload 按钮重启应用")
    return True

if __name__ == '__main__':
    main()
