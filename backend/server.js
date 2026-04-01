const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const DATA_FILE = path.join(__dirname, 'data.json');

// 默认权限定义
const defaultPermissions = [
  { id: 'rider_view', name: '查看骑手', module: '骑手管理' },
  { id: 'rider_create', name: '新增骑手', module: '骑手管理' },
  { id: 'rider_edit', name: '编辑骑手', module: '骑手管理' },
  { id: 'rider_delete', name: '删除骑手', module: '骑手管理' },
  { id: 'rider_import', name: '导入骑手', module: '骑手管理' },
  { id: 'rider_export', name: '导出骑手', module: '骑手管理' },
  { id: 'rider_delete_all', name: '删除所有骑手', module: '骑手管理' },
  { id: 'user_view', name: '查看用户', module: '权限管理' },
  { id: 'user_create', name: '新增用户', module: '权限管理' },
  { id: 'user_edit', name: '编辑用户', module: '权限管理' },
  { id: 'user_delete', name: '删除用户', module: '权限管理' },
  { id: 'role_view', name: '查看角色', module: '权限管理' },
  { id: 'role_create', name: '新增角色', module: '权限管理' },
  { id: 'role_edit', name: '编辑角色', module: '权限管理' },
  { id: 'role_delete', name: '删除角色', module: '权限管理' },
  { id: 'log_view', name: '查看日志', module: '操作日志' },
  { id: 'log_export', name: '导出日志', module: '操作日志' },
];

// 默认角色
const defaultRoles = [
  {
    id: 'admin',
    name: '管理员',
    permissions: defaultPermissions.map(p => p.id),
    description: '系统管理员，拥有所有权限'
  },
  {
    id: 'operator',
    name: '运营人员',
    permissions: ['rider_view', 'rider_create', 'rider_edit', 'rider_import', 'rider_export'],
    description: '日常运营人员，可管理骑手信息'
  },
  {
    id: 'viewer',
    name: '查看人员',
    permissions: ['rider_view', 'rider_export'],
    description: '仅可查看骑手信息'
  }
];

// 默认用户
const defaultUsers = [
  {
    id: '1',
    username: 'admin',
    password: '123456',
    name: '系统管理员',
    roleId: 'admin',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

// 动态站点列表
let defaultStations = {
  '杭州': [
    '杭州滨江区保利天汇站-UB',
    '杭州滨江区阿里巴巴园区站-UB',
    '杭州滨江区银泰站-UB',
    '杭州滨江区中赢站-UB',
    '杭州滨江区龙湖天街站-UB',
    '杭州滨江区星耀城站-UB',
    '杭州滨江区星光大道站-UB',
    '杭州滨江区西兴古镇站-UB'
  ],
  '上海': [
    '上海徐汇区徐家汇站-UB',
    '上海徐汇区肇家浜站-UB',
    '上海闵行区华泾路站-UB',
    '上海徐汇区南宁路站-UB',
    '上海闵行区颛桥镇站-UB',
    '上海闵行区万科城站-UB',
    '上海徐汇区上海南站站-UB',
    '上海徐汇区田林路站-UB',
    '上海徐汇区西岸站-UB'
  ],
  '深圳': [
    '深圳龙岗区平湖北站-UB',
    '深圳龙岗区平湖南站-UB',
    '深圳龙岗区大芬站-UB',
    '深圳龙岗区百鸽笼站-UB'
  ]
};

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  }
  return {
    riders: [],
    stations: defaultStations,
    users: defaultUsers,
    roles: defaultRoles,
    permissions: defaultPermissions,
    logs: []
  };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getAllStations() {
  const data = loadData();
  const stations = data.stations || defaultStations;
  const allStations = [];
  Object.keys(stations).forEach(city => {
    stations[city].forEach(station => {
      allStations.push({ city, name: station });
    });
  });
  return allStations;
}

function addStation(city, stationName) {
  const data = loadData();
  if (!data.stations) {
    data.stations = defaultStations;
  }
  if (!data.stations[city]) {
    data.stations[city] = [];
  }
  if (!data.stations[city].includes(stationName)) {
    data.stations[city].push(stationName);
    saveData(data);
  }
}

// 记录操作日志
function addLog(logData) {
  const data = loadData();
  if (!data.logs) {
    data.logs = [];
  }
  const log = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...logData
  };
  data.logs.unshift(log);
  // 只保留最近10000条日志
  if (data.logs.length > 10000) {
    data.logs = data.logs.slice(0, 10000);
  }
  saveData(data);
  return log;
}

// 验证用户token的中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  
  const data = loadData();
  const user = data.users?.find(u => u.token === token && u.status === 'active');
  if (!user) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }
  
  req.user = user;
  next();
}

// 权限检查中间件
function permissionMiddleware(permissionId) {
  return (req, res, next) => {
    const data = loadData();
    const role = data.roles?.find(r => r.id === req.user.roleId);
    if (!role || !role.permissions.includes(permissionId)) {
      return res.status(403).json({ success: false, message: '无权限执行此操作' });
    }
    next();
  };
}

// Excel日期转换函数
function excelDateToJSDate(excelDate) {
  if (typeof excelDate === 'number') {
    const excelEpoch = new Date(Date.UTC(1900, 0, 0));
    const daysToSubtract = excelDate > 60 ? 2 : 1;
    const date = new Date(excelEpoch.getTime() + (excelDate - daysToSubtract) * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }
  if (excelDate instanceof Date) {
    return excelDate.toISOString().split('T')[0];
  }
  if (typeof excelDate === 'string') {
    const date = new Date(excelDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  return String(excelDate);
}

function validateRider(rider, allStations, options = {}) {
  const errors = [];
  const { allowEmptyFields = false } = options;
  
  if (!allowEmptyFields) {
    if (!rider.riderId || rider.riderId.trim() === '') {
      errors.push('骑手ID不能为空');
    }
    if (!rider.name || rider.name.trim() === '') {
      errors.push('姓名不能为空');
    }
    if (!rider.phone || rider.phone.trim() === '') {
      errors.push('手机号不能为空');
    } else if (!/^1[3-9]\d{9}$/.test(rider.phone)) {
      errors.push('手机号格式不正确');
    }
    if (!rider.department || rider.department.trim() === '') {
      errors.push('部门不能为空');
    }
  } else {
    if (rider.phone && rider.phone.trim() !== '' && !/^1[3-9]\d{9}$/.test(rider.phone)) {
      errors.push('手机号格式不正确');
    }
  }
  
  return errors;
}

// ========== 登录认证接口 ==========

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const data = loadData();
  
  const user = data.users?.find(u => u.username === username && u.password === password);
  if (!user) {
    addLog({
      type: '登录',
      content: `用户 ${username} 登录失败：用户名或密码错误`,
      operator: username,
      result: '失败',
      ip: req.ip
    });
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
  
  if (user.status !== 'active') {
    addLog({
      type: '登录',
      content: `用户 ${username} 登录失败：账号已被禁用`,
      operator: username,
      result: '失败',
      ip: req.ip
    });
    return res.status(403).json({ success: false, message: '账号已被禁用' });
  }
  
  // 生成token
  const token = crypto.randomBytes(32).toString('hex');
  user.token = token;
  user.lastLoginAt = new Date().toISOString();
  saveData(data);
  
  const role = data.roles?.find(r => r.id === user.roleId);
  
  addLog({
    type: '登录',
    content: `用户 ${username} 登录成功`,
    operator: username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      roleId: user.roleId,
      roleName: role?.name || '未知角色'
    },
    permissions: role?.permissions || []
  });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const data = loadData();
  const user = data.users?.find(u => u.id === req.user.id);
  if (user) {
    delete user.token;
    saveData(data);
  }
  
  addLog({
    type: '登出',
    content: `用户 ${req.user.username} 登出`,
    operator: req.user.username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const data = loadData();
  const role = data.roles?.find(r => r.id === req.user.roleId);
  
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      name: req.user.name,
      roleId: req.user.roleId,
      roleName: role?.name || '未知角色'
    },
    permissions: role?.permissions || []
  });
});

// ========== 用户管理接口 ==========

app.get('/api/users', authMiddleware, permissionMiddleware('user_view'), (req, res) => {
  const data = loadData();
  const users = (data.users || []).map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    roleId: u.roleId,
    status: u.status,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt
  }));
  res.json({ success: true, users });
});

app.post('/api/users', authMiddleware, permissionMiddleware('user_create'), (req, res) => {
  const { username, password, name, roleId } = req.body;
  const data = loadData();
  
  if (!data.users) data.users = [];
  
  if (data.users.find(u => u.username === username)) {
    return res.status(400).json({ success: false, message: '用户名已存在' });
  }
  
  const newUser = {
    id: Date.now().toString(),
    username,
    password,
    name,
    roleId,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  
  data.users.push(newUser);
  saveData(data);
  
  addLog({
    type: '用户管理',
    content: `创建用户 ${username}`,
    operator: req.user.username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({ success: true, user: { ...newUser, password: undefined } });
});

app.put('/api/users/:id', authMiddleware, permissionMiddleware('user_edit'), (req, res) => {
  const { id } = req.params;
  const { name, roleId, status, password } = req.body;
  const data = loadData();
  
  const user = data.users?.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }
  
  if (name) user.name = name;
  if (roleId) user.roleId = roleId;
  if (status) user.status = status;
  if (password) user.password = password;
  
  saveData(data);
  
  addLog({
    type: '用户管理',
    content: `编辑用户 ${user.username}`,
    operator: req.user.username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({ success: true, user: { ...user, password: undefined } });
});

app.delete('/api/users/:id', authMiddleware, permissionMiddleware('user_delete'), (req, res) => {
  const { id } = req.params;
  const data = loadData();
  
  const index = data.users?.findIndex(u => u.id === id);
  if (index < 0) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }
  
  const username = data.users[index].username;
  data.users.splice(index, 1);
  saveData(data);
  
  addLog({
    type: '用户管理',
    content: `删除用户 ${username}`,
    operator: req.user.username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({ success: true });
});

// ========== 角色管理接口 ==========

app.get('/api/roles', authMiddleware, permissionMiddleware('role_view'), (req, res) => {
  const data = loadData();
  res.json({ success: true, roles: data.roles || defaultRoles });
});

app.get('/api/permissions', authMiddleware, (req, res) => {
  const data = loadData();
  res.json({ success: true, permissions: data.permissions || defaultPermissions });
});

app.post('/api/roles', authMiddleware, permissionMiddleware('role_create'), (req, res) => {
  const { name, permissions, description } = req.body;
  const data = loadData();
  
  if (!data.roles) data.roles = [];
  
  const newRole = {
    id: Date.now().toString(),
    name,
    permissions,
    description
  };
  
  data.roles.push(newRole);
  saveData(data);
  
  addLog({
    type: '角色管理',
    content: `创建角色 ${name}`,
    operator: req.user.username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({ success: true, role: newRole });
});

app.put('/api/roles/:id', authMiddleware, permissionMiddleware('role_edit'), (req, res) => {
  const { id } = req.params;
  const { name, permissions, description } = req.body;
  const data = loadData();
  
  const role = data.roles?.find(r => r.id === id);
  if (!role) {
    return res.status(404).json({ success: false, message: '角色不存在' });
  }
  
  if (name) role.name = name;
  if (permissions) role.permissions = permissions;
  if (description !== undefined) role.description = description;
  
  saveData(data);
  
  addLog({
    type: '角色管理',
    content: `编辑角色 ${role.name}`,
    operator: req.user.username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({ success: true, role });
});

app.delete('/api/roles/:id', authMiddleware, permissionMiddleware('role_delete'), (req, res) => {
  const { id } = req.params;
  const data = loadData();
  
  const index = data.roles?.findIndex(r => r.id === id);
  if (index < 0) {
    return res.status(404).json({ success: false, message: '角色不存在' });
  }
  
  const roleName = data.roles[index].name;
  data.roles.splice(index, 1);
  saveData(data);
  
  addLog({
    type: '角色管理',
    content: `删除角色 ${roleName}`,
    operator: req.user.username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({ success: true });
});

// ========== 操作日志接口 ==========

app.get('/api/logs', authMiddleware, permissionMiddleware('log_view'), (req, res) => {
  const { startDate, endDate, operator, type, page = 1, pageSize = 20 } = req.query;
  const data = loadData();
  let logs = data.logs || [];
  
  // 筛选
  if (startDate) {
    logs = logs.filter(l => l.timestamp >= startDate);
  }
  if (endDate) {
    logs = logs.filter(l => l.timestamp <= endDate + 'T23:59:59');
  }
  if (operator) {
    logs = logs.filter(l => l.operator?.includes(operator));
  }
  if (type) {
    logs = logs.filter(l => l.type === type);
  }
  
  // 分页
  const total = logs.length;
  const start = (page - 1) * pageSize;
  const end = start + parseInt(pageSize);
  logs = logs.slice(start, end);
  
  res.json({ success: true, logs, total });
});

app.get('/api/logs/export', authMiddleware, permissionMiddleware('log_export'), (req, res) => {
  const { startDate, endDate, operator, type } = req.query;
  const data = loadData();
  let logs = data.logs || [];
  
  if (startDate) logs = logs.filter(l => l.timestamp >= startDate);
  if (endDate) logs = logs.filter(l => l.timestamp <= endDate + 'T23:59:59');
  if (operator) logs = logs.filter(l => l.operator?.includes(operator));
  if (type) logs = logs.filter(l => l.type === type);
  
  const exportData = logs.map(log => ({
    '时间': log.timestamp,
    '操作人': log.operator,
    '操作类型': log.type,
    '操作内容': log.content,
    '结果': log.result,
    'IP地址': log.ip
  }));
  
  const worksheet = xlsx.utils.json_to_sheet(exportData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, '操作日志');
  
  const exportPath = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath);
  }
  
  const fileName = `操作日志_${Date.now()}.xlsx`;
  const filePath = path.join(exportPath, fileName);
  xlsx.writeFile(workbook, filePath);
  
  res.download(filePath, fileName, (err) => {
    if (err) console.error('下载错误:', err);
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 60000);
  });
});

// 获取今日操作统计
app.get('/api/logs/today-stats', authMiddleware, (req, res) => {
  const data = loadData();
  const logs = data.logs || [];
  
  // 获取今天的开始和结束时间（使用本地时区）
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  // 筛选今日日志
  const todayLogs = logs.filter(l => {
    const logDate = new Date(l.timestamp);
    return logDate >= todayStart && logDate < todayEnd;
  });
  
  // 统计各类操作
  const stats = {
    total: todayLogs.length,
    create: todayLogs.filter(l => l.type === '骑手管理' && l.content?.includes('新增')).length,
    import: todayLogs.filter(l => l.type === '骑手管理' && l.content?.includes('导入')).length,
    delete: todayLogs.filter(l => l.type === '骑手管理' && l.content?.includes('删除')).length,
    update: todayLogs.filter(l => l.type === '骑手管理' && l.content?.includes('更新')).length,
    login: todayLogs.filter(l => l.type === '登录').length
  };
  
  res.json({ success: true, stats, logs: todayLogs.slice(0, 10) });
});

// ========== 骑手管理接口 ==========

app.get('/api/stations', authMiddleware, (req, res) => {
  const data = loadData();
  res.json({ stations: data.stations || defaultStations });
});

app.get('/api/riders', authMiddleware, permissionMiddleware('rider_view'), (req, res) => {
  const { city, station, startDate, endDate } = req.query;
  const data = loadData();
  let riders = data.riders || [];
  
  if (city && city !== 'all') {
    const stations = data.stations || defaultStations;
    const cityStations = stations[city] || [];
    riders = riders.filter(r => cityStations.includes(r.department));
  }
  
  if (station && station !== 'all') {
    riders = riders.filter(r => r.department === station);
  }
  
  if (startDate) {
    riders = riders.filter(r => r.entryDate && r.entryDate >= startDate);
  }
  
  if (endDate) {
    riders = riders.filter(r => r.entryDate && r.entryDate <= endDate);
  }
  
  res.json({ riders });
});

app.post('/api/riders', authMiddleware, permissionMiddleware('rider_create'), (req, res) => {
  const rider = req.body;
  const allStations = getAllStations();
  const errors = validateRider(rider, allStations);
  
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }
  
  const data = loadData();
  if (!data.riders) data.riders = [];
  
  const existingIndex = data.riders.findIndex(r => r.riderId === rider.riderId);
  if (existingIndex >= 0) {
    return res.status(400).json({ success: false, errors: ['骑手ID已存在'] });
  }
  
  data.riders.push(rider);
  saveData(data);
  
  addLog({
    type: '骑手管理',
    content: `新增骑手 ${rider.name}(${rider.riderId})`,
    operator: req.user.username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({ success: true, rider });
});

app.put('/api/riders/:riderId', authMiddleware, permissionMiddleware('rider_edit'), (req, res) => {
  const { riderId } = req.params;
  const rider = req.body;
  const allStations = getAllStations();
  const errors = validateRider(rider, allStations);
  
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }
  
  const data = loadData();
  const index = data.riders?.findIndex(r => r.riderId === riderId);
  
  if (index < 0) {
    return res.status(404).json({ success: false, errors: ['骑手不存在'] });
  }
  
  data.riders[index] = { ...data.riders[index], ...rider };
  saveData(data);
  
  addLog({
    type: '骑手管理',
    content: `编辑骑手 ${rider.name}(${riderId})`,
    operator: req.user.username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({ success: true, rider: data.riders[index] });
});

// 注意：/api/riders/all 必须在 /api/riders/:riderId 之前定义，否则 Express 会把 "all" 当作 riderId
app.delete('/api/riders/all', authMiddleware, permissionMiddleware('rider_delete_all'), (req, res) => {
  try {
    const data = loadData();
    const count = data.riders?.length || 0;
    data.riders = [];
    saveData(data);
    
    addLog({
      type: '骑手管理',
      content: `删除所有骑手数据，共 ${count} 条`,
      operator: req.user.username,
      result: '成功',
      ip: req.ip
    });
    
    res.json({ success: true, message: `已删除 ${count} 条骑手数据` });
  } catch (error) {
    console.error('删除所有数据失败:', error);
    res.status(500).json({ success: false, message: '删除失败', error: error.message });
  }
});

app.delete('/api/riders/:riderId', authMiddleware, permissionMiddleware('rider_delete'), (req, res) => {
  const { riderId } = req.params;
  const data = loadData();
  const index = data.riders?.findIndex(r => r.riderId === riderId);
  
  if (index < 0) {
    return res.status(404).json({ success: false, errors: ['骑手不存在'] });
  }
  
  const riderName = data.riders[index].name;
  data.riders.splice(index, 1);
  saveData(data);
  
  addLog({
    type: '骑手管理',
    content: `删除骑手 ${riderName}(${riderId})`,
    operator: req.user.username,
    result: '成功',
    ip: req.ip
  });
  
  res.json({ success: true });
});

app.post('/api/riders/import', authMiddleware, permissionMiddleware('rider_import'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, errors: ['请选择文件'] });
  }
  
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    
    const allStations = getAllStations();
    const data = loadData();
    const results = { success: 0, failed: 0, errors: [], warnings: [] };
    const newStations = [];
    
    const fieldMapping = {
      '骑手ID': 'riderId',
      '姓名': 'name',
      '手机号': 'phone',
      '部门': 'department',
      '身份证': 'idCard',
      '入职时间': 'entryDate',
      '状态': 'status',
      '骑手状态': 'riderStatus',
      '骑手入职性质': 'employmentType',
      '骑手入职来源': 'employmentSource',
      '推荐人': 'referrer',
      '单价': 'unitPrice',
      '结算频率': 'settlementFrequency',
      '调整时间': 'adjustmentTime',
      '兼职转全职/全职转兼职/单价调整': 'adjustmentInfo',
      '备注': 'remark',
      '是否绑定银行卡': 'hasBankCard',
      '绑定他人银行卡注明': 'otherBankCardHolder',
      '是否入住公司宿舍': 'hasDormitory',
      '是否公司垫付租车': 'hasCompanyRental',
      '头盔数量': 'helmetCount',
      '制服数量': 'uniformCount',
      '餐箱数量': 'foodBoxCount',
      '是否签署全职/兼职/点现合同': 'hasContract'
    };
    
    jsonData.forEach((row, index) => {
      const rider = {};
      const rowWarnings = [];
      
      Object.keys(fieldMapping).forEach(chineseKey => {
        const englishKey = fieldMapping[chineseKey];
        let value = row[chineseKey];
        
        if ((englishKey === 'entryDate' || englishKey === 'adjustmentTime') && value !== undefined && value !== '') {
          value = excelDateToJSDate(value);
        }
        
        rider[englishKey] = value !== undefined ? String(value) : '';
      });
      
      if (!rider.riderId || rider.riderId.trim() === '') rowWarnings.push('骑手ID为空');
      if (!rider.name || rider.name.trim() === '') rowWarnings.push('姓名为空');
      if (!rider.phone || rider.phone.trim() === '') rowWarnings.push('手机号为空');
      if (!rider.department || rider.department.trim() === '') rowWarnings.push('部门为空');
      
      if (rider.department && rider.department.trim() !== '') {
        const validStation = allStations.find(s => s.name === rider.department);
        if (!validStation) {
          let city = '';
          if (rider.department.includes('杭州')) city = '杭州';
          else if (rider.department.includes('上海')) city = '上海';
          else if (rider.department.includes('深圳')) city = '深圳';
          
          if (city) {
            addStation(city, rider.department);
            newStations.push({ city, name: rider.department });
            allStations.push({ city, name: rider.department });
            rowWarnings.push(`自动创建部门：${rider.department}`);
          } else {
            rowWarnings.push(`无法识别部门所属城市：${rider.department}`);
          }
        }
      }
      
      const errors = validateRider(rider, allStations, { allowEmptyFields: true });
      
      if (errors.length > 0) {
        results.failed++;
        results.errors.push(`第${index + 2}行: ${errors.join(', ')}`);
      } else {
        const existingIndex = data.riders?.findIndex(r => r.riderId === rider.riderId && rider.riderId !== '');
        if (existingIndex >= 0) {
          data.riders[existingIndex] = { ...data.riders[existingIndex], ...rider };
        } else {
          data.riders.push(rider);
        }
        results.success++;
        
        if (rowWarnings.length > 0) {
          results.warnings.push(`第${index + 2}行: ${rowWarnings.join(', ')}`);
        }
      }
    });
    
    saveData(data);
    fs.unlinkSync(req.file.path);
    
    if (newStations.length > 0) {
      results.warnings.unshift(`自动发现并添加了 ${newStations.length} 个新站点`);
    }
    
    addLog({
      type: '骑手管理',
      content: `导入骑手数据，成功 ${results.success} 条，失败 ${results.failed} 条`,
      operator: req.user.username,
      result: '成功',
      ip: req.ip
    });
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('导入错误:', error);
    res.status(500).json({ success: false, errors: [error.message] });
  }
});

app.get('/api/riders/export', authMiddleware, permissionMiddleware('rider_export'), (req, res) => {
  const { city, station, startDate, endDate } = req.query;
  const data = loadData();
  let riders = data.riders || [];
  
  if (city && city !== 'all') {
    const stations = data.stations || defaultStations;
    const cityStations = stations[city] || [];
    riders = riders.filter(r => cityStations.includes(r.department));
  }
  
  if (station && station !== 'all') {
    riders = riders.filter(r => r.department === station);
  }
  
  if (startDate) {
    riders = riders.filter(r => r.entryDate && r.entryDate >= startDate);
  }
  
  if (endDate) {
    riders = riders.filter(r => r.entryDate && r.entryDate <= endDate);
  }
  
  const fieldMapping = {
    'riderId': '骑手ID',
    'name': '姓名',
    'phone': '手机号',
    'department': '部门',
    'idCard': '身份证',
    'entryDate': '入职时间',
    'status': '状态',
    'riderStatus': '骑手状态',
    'employmentType': '骑手入职性质',
    'employmentSource': '骑手入职来源',
    'referrer': '推荐人',
    'unitPrice': '单价',
    'settlementFrequency': '结算频率',
    'adjustmentInfo': '有兼职转全职/全职转兼职需/单价调整，需备注时间',
    'remark': '备注',
    'hasBankCard': '是否绑定银行卡',
    'otherBankCardHolder': '绑定他人银行卡注明',
    'hasDormitory': '是否入住公司宿舍',
    'hasCompanyRental': '是否公司垫付租车',
    'helmetCount': '头盔数量',
    'uniformCount': '制服数量',
    'foodBoxCount': '餐箱数量',
    'hasContract': '是否签署全职/兼职/点现合同'
  };

  const exportData = riders.map(rider => {
    const row = {};
    Object.keys(fieldMapping).forEach(englishKey => {
      const chineseKey = fieldMapping[englishKey];
      // 调整记录字段：合并 adjustmentTime 和 adjustmentInfo
      if (englishKey === 'adjustmentInfo') {
        const time = rider.adjustmentTime || '';
        const info = rider.adjustmentInfo || '';
        if (time && info) {
          row[chineseKey] = `${time} ${info}`;
        } else if (time) {
          row[chineseKey] = time;
        } else if (info) {
          row[chineseKey] = info;
        } else {
          row[chineseKey] = '';
        }
      } else {
        row[chineseKey] = rider[englishKey] || '';
      }
    });
    return row;
  });
  
  const worksheet = xlsx.utils.json_to_sheet(exportData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, '骑手花名册');
  
  const exportPath = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath);
  }
  
  const fileName = `骑手花名册_${Date.now()}.xlsx`;
  const filePath = path.join(exportPath, fileName);
  xlsx.writeFile(workbook, filePath);
  
  res.download(filePath, fileName, (err) => {
    if (err) console.error('下载错误:', err);
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 60000);
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
