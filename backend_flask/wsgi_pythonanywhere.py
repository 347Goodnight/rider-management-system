import sys
import os

# 添加项目路径
path = '/home/347Goodnight/backend_flask'
if path not in sys.path:
    sys.path.insert(0, path)

# 激活虚拟环境
activate_this = '/home/347Goodnight/backend_flask/venv/bin/activate_this.py'
exec(open(activate_this).read(), {'__file__': activate_this})

# 导入 Flask 应用
from app import app as application
