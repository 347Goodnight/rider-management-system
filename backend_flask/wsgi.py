import sys
import os

# 添加项目路径
path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.insert(0, path)

# 导入 Flask 应用
from app import app as application

# PythonAnywhere 使用 application 变量
