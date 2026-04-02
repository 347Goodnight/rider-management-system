from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
import uuid
import pandas as pd
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)

# 全局 CORS 配置
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'https://rider-management-system-radw.vercel.app')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# 处理 OPTIONS 预检请求
@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return '', 200

# 配置
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 默认权限
DEFAULT_PERMISSIONS = [
    {"id": "rider_view", "name": "查看骑手", "module": "骑手管理"},
    {"id": "rider_create", "name": "新增骑手", "module": "骑手管理"},
    {"id": "rider_edit", "name": "编辑骑手", "module": "骑手管理"},
    {"id": "rider_delete", "name": "删除骑手", "module": "骑手管理"},
    {"id": "rider_import", "name": "导入骑手", "module": "骑手管理"},
    {"id": "rider_export", "name": "导出骑手", "module": "骑手管理"},
    {"id": "rider_delete_all", "name": "删除所有骑手", "module": "骑手管理"},
    {"id": "user_view", "name": "查看用户", "module": "权限管理"},
    {"id": "user_create", "name": "新增用户", "module": "权限管理"},
    {"id": "user_edit", "name": "编辑用户", "module": "权限管理"},
    {"id": "user_delete", "name": "删除用户", "module": "权限管理"},
    {"id": "role_view", "name": "查看角色", "module": "权限管理"},
    {"id": "role_create", "name": "新增角色", "module": "权限管理"},
    {"id": "role_edit", "name": "编辑角色", "module": "权限管理"},
    {"id": "role_delete", "name": "删除角色", "module": "权限管理"},
    {"id": "log_view", "name": "查看日志", "module": "操作日志"},
    {"id": "log_export", "name": "导出日志", "module": "操作日志"},
]

# 默认角色
DEFAULT_ROLES = [
    {
        "id": "admin",
        "name": "管理员",
        "permissions": [p["id"] for p in DEFAULT_PERMISSIONS],
        "description": "系统管理员，拥有所有权限"
    },
    {
        "id": "operator",
        "name": "运营人员",
        "permissions": ["rider_view", "rider_create", "rider_edit", "rider_import", "rider_export"],
        "description": "日常运营人员，可管理骑手信息"
    },
    {
        "id": "viewer",
        "name": "查看人员",
        "permissions": ["rider_view", "rider_export"],
        "description": "仅可查看骑手信息"
    }
]

# 默认用户
DEFAULT_USERS = [
    {
        "id": "1",
        "username": "admin",
        "password": "123456",
        "name": "系统管理员",
        "roleId": "admin",
        "status": "active",
        "createdAt": datetime.now().isoformat()
    }
]

# 默认站点
DEFAULT_STATIONS = {
    "杭州": [
        "杭州滨江区保利天汇站-UB",
        "杭州滨江区阿里巴巴园区站-UB",
        "杭州滨江区银泰站-UB",
        "杭州滨江区中赢站-UB",
        "杭州滨江区龙湖天街站-UB",
        "杭州滨江区星耀城站-UB",
        "杭州滨江区星光大道站-UB",
    ],
    "上海": [
        "上海徐汇区徐家汇站-UB",
        "上海徐汇区肇家浜站-UB",
        "上海闵行区华泾路站-UB",
        "上海徐汇区南宁路站-UB",
        "上海闵行区颛桥镇站-UB",
        "上海闵行区万科城站-UB",
        "上海徐汇区上海南站站-UB",
        "上海徐汇区田林路站-UB",
        "上海徐汇区西岸站-UB",
    ],
    "深圳": [
        "深圳龙岗区平湖北站-UB",
        "深圳龙岗区平湖南站-UB",
        "深圳龙岗区大芬站-UB",
        "深圳龙岗区百鸽笼站-UB",
    ]
}


def load_data():
    """加载数据"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "riders": [],
        "stations": DEFAULT_STATIONS,
        "users": DEFAULT_USERS,
        "roles": DEFAULT_ROLES,
        "permissions": DEFAULT_PERMISSIONS,
        "logs": []
    }


def save_data(data):
    """保存数据"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def add_log(log_data):
    """添加日志"""
    data = load_data()
    if "logs" not in data:
        data["logs"] = []
    
    log = {
        "id": str(int(datetime.now().timestamp() * 1000)),
        "timestamp": datetime.now().isoformat(),
        **log_data
    }
    data["logs"].insert(0, log)
    
    # 只保留最近10000条
    if len(data["logs"]) > 10000:
        data["logs"] = data["logs"][:10000]
    
    save_data(data)
    return log


# ========== 登录认证接口 ==========

@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录"""
    req_data = request.get_json()
    username = req_data.get('username')
    password = req_data.get('password')
    
    data = load_data()
    user = next((u for u in data.get('users', []) 
                 if u.get('username') == username and u.get('password') == password), None)
    
    if not user:
        add_log({
            "type": "登录",
            "content": f"用户 {username} 登录失败：用户名或密码错误",
            "operator": username,
            "result": "失败"
        })
        return jsonify({"success": False, "message": "用户名或密码错误"}), 401
    
    if user.get('status') != 'active':
        add_log({
            "type": "登录",
            "content": f"用户 {username} 登录失败：账号已被禁用",
            "operator": username,
            "result": "失败"
        })
        return jsonify({"success": False, "message": "账号已被禁用"}), 403
    
    # 生成 token
    token = str(uuid.uuid4())
    user['token'] = token
    user['lastLoginAt'] = datetime.now().isoformat()
    save_data(data)
    
    role = next((r for r in data.get('roles', []) if r.get('id') == user.get('roleId')), None)

    # 获取用户权限
    permissions = role.get('permissions', []) if role else []

    add_log({
        "type": "登录",
        "content": f"用户 {username} 登录成功",
        "operator": username,
        "result": "成功"
    })

    return jsonify({
        "success": True,
        "data": {
            "token": token,
            "user": {
                "id": user['id'],
                "username": user['username'],
                "name": user['name'],
                "roleId": user['roleId'],
                "roleName": role['name'] if role else ''
            },
            "permissions": permissions
        }
    })


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """用户登出"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token:
        data = load_data()
        for user in data.get('users', []):
            if user.get('token') == token:
                user.pop('token', None)
                save_data(data)
                break
    
    return jsonify({"success": True})


@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """获取当前用户信息"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({"success": False, "message": "未登录"}), 401
    
    data = load_data()
    user = next((u for u in data.get('users', []) 
                 if u.get('token') == token and u.get('status') == 'active'), None)
    
    if not user:
        return jsonify({"success": False, "message": "登录已过期"}), 401
    
    role = next((r for r in data.get('roles', []) if r.get('id') == user.get('roleId')), None)

    # 获取用户权限
    permissions = role.get('permissions', []) if role else []

    return jsonify({
        "success": True,
        "data": {
            "user": {
                "id": user['id'],
                "username": user['username'],
                "name": user['name'],
                "roleId": user['roleId'],
                "roleName": role['name'] if role else ''
            },
            "permissions": permissions
        }
    })


# ========== 站点接口 ==========

@app.route('/api/stations', methods=['GET'])
def get_stations():
    """获取所有站点"""
    data = load_data()
    stations = data.get('stations', DEFAULT_STATIONS)
    
    result = []
    for city, station_list in stations.items():
        for station in station_list:
            result.append({"city": city, "name": station})
    
    return jsonify({"success": True, "data": result})


# ========== 骑手管理接口 ==========

@app.route('/api/riders', methods=['GET'])
def get_riders():
    """获取骑手列表"""
    city = request.args.get('city')
    station = request.args.get('station')
    
    data = load_data()
    riders = data.get('riders', [])
    
    # 筛选
    if city:
        riders = [r for r in riders if city in r.get('department', '')]
    if station:
        riders = [r for r in riders if station in r.get('department', '')]
    
    return jsonify({"success": True, "data": riders})


@app.route('/api/riders', methods=['POST'])
def create_rider():
    """创建骑手"""
    req_data = request.get_json()
    
    # 验证必填字段
    if not req_data.get('riderId'):
        return jsonify({"success": False, "message": "骑手ID不能为空"}), 400
    if not req_data.get('name'):
        return jsonify({"success": False, "message": "姓名不能为空"}), 400
    if not req_data.get('phone'):
        return jsonify({"success": False, "message": "手机号不能为空"}), 400
    
    data = load_data()
    
    # 检查骑手ID是否已存在
    if any(r.get('riderId') == req_data.get('riderId') for r in data.get('riders', [])):
        return jsonify({"success": False, "message": "骑手ID已存在"}), 400
    
    rider = {
        "id": str(int(datetime.now().timestamp() * 1000)),
        "createdAt": datetime.now().isoformat(),
        **req_data
    }
    
    data['riders'].append(rider)
    save_data(data)
    
    add_log({
        "type": "骑手管理",
        "content": f"新增骑手：{rider.get('name')}({rider.get('riderId')})",
        "result": "成功"
    })
    
    return jsonify({"success": True, "data": rider})


@app.route('/api/riders/<rider_id>', methods=['PUT'])
def update_rider(rider_id):
    """更新骑手"""
    req_data = request.get_json()
    
    data = load_data()
    rider = next((r for r in data.get('riders', []) if r.get('riderId') == rider_id), None)
    
    if not rider:
        return jsonify({"success": False, "message": "骑手不存在"}), 404
    
    rider.update(req_data)
    rider['updatedAt'] = datetime.now().isoformat()
    save_data(data)
    
    add_log({
        "type": "骑手管理",
        "content": f"更新骑手：{rider.get('name')}({rider.get('riderId')})",
        "result": "成功"
    })
    
    return jsonify({"success": True, "data": rider})


@app.route('/api/riders/<rider_id>', methods=['DELETE'])
def delete_rider(rider_id):
    """删除骑手"""
    data = load_data()
    rider = next((r for r in data.get('riders', []) if r.get('riderId') == rider_id), None)
    
    if not rider:
        return jsonify({"success": False, "message": "骑手不存在"}), 404
    
    data['riders'] = [r for r in data.get('riders', []) if r.get('riderId') != rider_id]
    save_data(data)
    
    add_log({
        "type": "骑手管理",
        "content": f"删除骑手：{rider.get('name')}({rider.get('riderId')})",
        "result": "成功"
    })
    
    return jsonify({"success": True})


@app.route('/api/riders/all', methods=['DELETE'])
def delete_all_riders():
    """删除所有骑手"""
    data = load_data()
    count = len(data.get('riders', []))
    data['riders'] = []
    save_data(data)
    
    add_log({
        "type": "骑手管理",
        "content": f"删除所有骑手，共 {count} 人",
        "result": "成功"
    })
    
    return jsonify({"success": True, "message": f"已删除 {count} 名骑手"})


@app.route('/api/riders/import', methods=['POST'])
def import_riders():
    """导入骑手（Excel）"""
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "没有上传文件"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "没有选择文件"}), 400
    
    try:
        # 保存文件
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # 读取 Excel
        df = pd.read_excel(filepath)
        
        data = load_data()
        imported_count = 0
        updated_count = 0
        
        for _, row in df.iterrows():
            rider_data = row.to_dict()
            
            # 检查是否已存在
            existing = next((r for r in data.get('riders', []) 
                           if r.get('riderId') == str(rider_data.get('骑手ID', ''))), None)
            
            if existing:
                # 更新
                existing.update({
                    "name": str(rider_data.get('姓名', '')),
                    "phone": str(rider_data.get('手机号', '')),
                    "department": str(rider_data.get('部门', '')),
                    "updatedAt": datetime.now().isoformat()
                })
                updated_count += 1
            else:
                # 新增
                new_rider = {
                    "id": str(int(datetime.now().timestamp() * 1000) + imported_count),
                    "riderId": str(rider_data.get('骑手ID', '')),
                    "name": str(rider_data.get('姓名', '')),
                    "phone": str(rider_data.get('手机号', '')),
                    "department": str(rider_data.get('部门', '')),
                    "createdAt": datetime.now().isoformat()
                }
                data['riders'].append(new_rider)
                imported_count += 1
        
        save_data(data)
        
        add_log({
            "type": "骑手管理",
            "content": f"导入骑手：新增 {imported_count} 人，更新 {updated_count} 人",
            "result": "成功"
        })
        
        return jsonify({
            "success": True,
            "message": f"导入成功：新增 {imported_count} 人，更新 {updated_count} 人"
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": f"导入失败：{str(e)}"}), 500


@app.route('/api/riders/export', methods=['GET'])
def export_riders():
    """导出骑手（Excel）"""
    city = request.args.get('city')
    station = request.args.get('station')
    
    data = load_data()
    riders = data.get('riders', [])
    
    # 筛选
    if city:
        riders = [r for r in riders if city in r.get('department', '')]
    if station:
        riders = [r for r in riders if station in r.get('department', '')]
    
    if not riders:
        return jsonify({"success": False, "message": "没有数据可导出"}), 400
    
    # 创建 DataFrame
    df = pd.DataFrame(riders)
    
    # 导出 Excel
    filename = f"骑手数据_{datetime.now().strftime('%Y%m%d')}.xlsx"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    df.to_excel(filepath, index=False)
    
    return send_file(filepath, as_attachment=True, download_name=filename)


# ========== 用户管理接口 ==========

@app.route('/api/users', methods=['GET'])
def get_users():
    """获取用户列表"""
    data = load_data()
    users = data.get('users', [])
    
    # 不返回密码
    result = []
    for user in users:
        user_copy = user.copy()
        user_copy.pop('password', None)
        result.append(user_copy)
    
    return jsonify({"success": True, "data": result})


@app.route('/api/users', methods=['POST'])
def create_user():
    """创建用户"""
    req_data = request.get_json()
    
    data = load_data()
    
    # 检查用户名是否已存在
    if any(u.get('username') == req_data.get('username') for u in data.get('users', [])):
        return jsonify({"success": False, "message": "用户名已存在"}), 400
    
    user = {
        "id": str(int(datetime.now().timestamp() * 1000)),
        "createdAt": datetime.now().isoformat(),
        **req_data
    }
    
    data['users'].append(user)
    save_data(data)
    
    add_log({
        "type": "权限管理",
        "content": f"新增用户：{user.get('username')}",
        "result": "成功"
    })
    
    return jsonify({"success": True, "data": user})


@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    """更新用户"""
    req_data = request.get_json()
    
    data = load_data()
    user = next((u for u in data.get('users', []) if u.get('id') == user_id), None)
    
    if not user:
        return jsonify({"success": False, "message": "用户不存在"}), 404
    
    user.update(req_data)
    user['updatedAt'] = datetime.now().isoformat()
    save_data(data)
    
    return jsonify({"success": True, "data": user})


@app.route('/api/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """删除用户"""
    data = load_data()
    user = next((u for u in data.get('users', []) if u.get('id') == user_id), None)
    
    if not user:
        return jsonify({"success": False, "message": "用户不存在"}), 404
    
    data['users'] = [u for u in data.get('users', []) if u.get('id') != user_id]
    save_data(data)
    
    add_log({
        "type": "权限管理",
        "content": f"删除用户：{user.get('username')}",
        "result": "成功"
    })
    
    return jsonify({"success": True})


# ========== 角色管理接口 ==========

@app.route('/api/roles', methods=['GET'])
def get_roles():
    """获取角色列表"""
    data = load_data()
    return jsonify({"success": True, "data": data.get('roles', DEFAULT_ROLES)})


@app.route('/api/roles', methods=['POST'])
def create_role():
    """创建角色"""
    req_data = request.get_json()
    
    data = load_data()
    
    if any(r.get('id') == req_data.get('id') for r in data.get('roles', [])):
        return jsonify({"success": False, "message": "角色ID已存在"}), 400
    
    role = {
        "createdAt": datetime.now().isoformat(),
        **req_data
    }
    
    data['roles'].append(role)
    save_data(data)
    
    return jsonify({"success": True, "data": role})


@app.route('/api/roles/<role_id>', methods=['PUT'])
def update_role(role_id):
    """更新角色"""
    req_data = request.get_json()
    
    data = load_data()
    role = next((r for r in data.get('roles', []) if r.get('id') == role_id), None)
    
    if not role:
        return jsonify({"success": False, "message": "角色不存在"}), 404
    
    role.update(req_data)
    role['updatedAt'] = datetime.now().isoformat()
    save_data(data)
    
    return jsonify({"success": True, "data": role})


@app.route('/api/roles/<role_id>', methods=['DELETE'])
def delete_role(role_id):
    """删除角色"""
    data = load_data()
    role = next((r for r in data.get('roles', []) if r.get('id') == role_id), None)
    
    if not role:
        return jsonify({"success": False, "message": "角色不存在"}), 404
    
    data['roles'] = [r for r in data.get('roles', []) if r.get('id') != role_id]
    save_data(data)
    
    return jsonify({"success": True})


# ========== 权限接口 ==========

@app.route('/api/permissions', methods=['GET'])
def get_permissions():
    """获取权限列表"""
    return jsonify({"success": True, "data": DEFAULT_PERMISSIONS})


# ========== 日志接口 ==========

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """获取日志列表"""
    data = load_data()
    logs = data.get('logs', [])
    
    # 分页
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('pageSize', 20))
    
    total = len(logs)
    start = (page - 1) * page_size
    end = start + page_size
    
    return jsonify({
        "success": True,
        "data": logs[start:end],
        "total": total
    })


@app.route('/api/logs/today-stats', methods=['GET'])
def get_today_stats():
    """获取今日统计"""
    data = load_data()
    logs = data.get('logs', [])
    
    today = datetime.now().strftime('%Y-%m-%d')
    today_logs = [l for l in logs if l.get('timestamp', '').startswith(today)]
    
    return jsonify({
        "success": True,
        "data": {
            "total": len(logs),
            "today": len(today_logs)
        }
    })


# ========== 主页 ==========

@app.route('/')
def index():
    return jsonify({
        "message": "骑手花名册管理系统 API",
        "version": "1.0.0",
        "status": "running"
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
