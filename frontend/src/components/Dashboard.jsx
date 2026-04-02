import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  ImportOutlined,
  PlusOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserOutlined
} from '@ant-design/icons';
import { Button, Card, Col, List, Row, Select, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { getLogs, getRiders, getStations, getTodayStats, getUsers } from '../api';

const { Option } = Select;

const Dashboard = ({ onNavigate }) => {
  const navigate = (page) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };
  const [stats, setStats] = useState({
    riderCount: 0,
    activeRiders: 0,
    userCount: 0,
    todayTotal: 0,
    todayCreate: 0,
    todayImport: 0,
    todayDelete: 0,
    todayUpdate: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [stations, setStations] = useState({});
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedStation, setSelectedStation] = useState('all');
  const [filteredStations, setFilteredStations] = useState([]);

  // 模拟环比数据
  const [trends] = useState({
    riderCount: { value: 12.5, up: true },
    activeRiders: { value: 8.3, up: true },
    userCount: { value: 0, up: true },
    todayTotal: { value: 23.1, up: true }
  });

  useEffect(() => {
    fetchDashboardData();
    fetchStations();
  }, []);

  useEffect(() => {
    if (selectedCity && selectedCity !== 'all') {
      setFilteredStations(stations[selectedCity] || []);
      setSelectedStation('all');
    } else {
      setFilteredStations([]);
      setSelectedStation('all');
    }
  }, [selectedCity, stations]);

  const fetchStations = async () => {
    try {
      const response = await getStations();
      const stationsData = response.data?.stations || {};
      setStations(stationsData);
      setCities(Object.keys(stationsData));
    } catch (error) {
      console.error('获取站点数据失败:', error);
      setStations({});
      setCities([]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [ridersRes, usersRes, logsRes, todayStatsRes] = await Promise.all([
        getRiders(),
        getUsers(),
        getLogs({ page: 1, pageSize: 10 }),
        getTodayStats()
      ]);

      const riders = ridersRes.data.riders || [];
      const users = usersRes.data.users || [];
      const logs = logsRes.data.logs || [];
      const todayStats = todayStatsRes.data.stats || {};

      setStats({
        riderCount: riders.length,
        activeRiders: riders.filter(r => r.status === '在职').length,
        userCount: users.length,
        todayTotal: todayStats.total || 0,
        todayCreate: todayStats.create || 0,
        todayImport: todayStats.import || 0,
        todayDelete: todayStats.delete || 0,
        todayUpdate: todayStats.update || 0
      });

      setRecentLogs(logs.slice(0, 10));
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    }
  };

  const handleLogClick = (log) => {
    if (log.type === '骑手管理') {
      navigate('/riders');
    } else if (log.type === '用户管理' || log.type === '角色管理') {
      navigate('/permissions');
    }
  };

  const handleQuickAction = (action) => {
    if (action === 'import') {
      navigate('/riders');
    } else if (action === 'addRider') {
      navigate('/riders');
    } else if (action === 'addUser') {
      navigate('/permissions');
    }
  };

  const getTrendIcon = (up) => up ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : <ArrowDownOutlined style={{ color: '#f5222d' }} />;

  return (
    <div className="dashboard-container">
      {/* 顶部工具栏 - 城市/站点选择器 */}
      <div className="dashboard-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-label">数据范围：</span>
          <Select
            value={selectedCity}
            onChange={setSelectedCity}
            style={{ width: 120, marginRight: 12 }}
            placeholder="选择城市"
          >
            <Option value="all">全部城市</Option>
            {cities.map(city => (
              <Option key={city} value={city}>{city}</Option>
            ))}
          </Select>
          <Select
            value={selectedStation}
            onChange={setSelectedStation}
            style={{ width: 140 }}
            placeholder="选择站点"
            disabled={selectedCity === 'all'}
          >
            <Option value="all">全部站点</Option>
            {filteredStations.map(station => (
              <Option key={station} value={station}>{station}</Option>
            ))}
          </Select>
        </div>
        <div className="toolbar-right">
          {/* 导入骑手和新增骑手按钮已移除 */}
        </div>
      </div>

      {/* 第一行：核心运营指标 - 蓝色背景区域 */}
      <div className="dashboard-section stats-section">
        <div className="section-header">
          <h3 className="section-title">
            <ThunderboltOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            核心运营指标
          </h3>
          <span className="section-subtitle">实时数据监控</span>
        </div>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card className="stat-card primary" bordered={false}>
              <div className="stat-header">
                <TeamOutlined className="stat-icon" />
                <span className="stat-trend">
                  {getTrendIcon(trends.riderCount.up)} {trends.riderCount.value}%
                </span>
              </div>
              <div className="stat-value">{stats.riderCount}</div>
              <div className="stat-label">总骑手数</div>
              <div className="stat-footer">
                <span className="stat-compare">较昨日</span>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card success" bordered={false}>
              <div className="stat-header">
                <CheckCircleOutlined className="stat-icon" />
                <span className="stat-trend">
                  {getTrendIcon(trends.activeRiders.up)} {trends.activeRiders.value}%
                </span>
              </div>
              <div className="stat-value" style={{ color: '#52c41a' }}>{stats.activeRiders}</div>
              <div className="stat-label">在职骑手</div>
              <div className="stat-footer">
                <span className="stat-compare">占比 {stats.riderCount > 0 ? ((stats.activeRiders / stats.riderCount) * 100).toFixed(1) : 0}%</span>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card warning" bordered={false}>
              <div className="stat-header">
                <UserOutlined className="stat-icon" />
                <span className="stat-trend">
                  <span style={{ color: '#999' }}>-</span>
                </span>
              </div>
              <div className="stat-value" style={{ color: '#faad14' }}>{stats.userCount}</div>
              <div className="stat-label">系统用户</div>
              <div className="stat-footer">
                <span className="stat-compare">管理人员</span>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card info" bordered={false}>
              <div className="stat-header">
                <FileTextOutlined className="stat-icon" />
                <span className="stat-trend">
                  {getTrendIcon(trends.todayTotal.up)} {trends.todayTotal.value}%
                </span>
              </div>
              <div className="stat-value" style={{ color: '#1890ff' }}>{stats.todayTotal}</div>
              <div className="stat-label">今日操作</div>
              <div className="stat-footer">
                <span className="stat-compare">较昨日</span>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 第二行：今日动态 + 操作日志 - 双栏布局 */}
      <div className="dashboard-section">
        <Row gutter={[16, 16]}>
          {/* 左侧：今日动态统计 */}
          <Col span={16}>
            <Card 
              className="dashboard-card"
              title={
                <div className="card-title">
                  <ClockCircleOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                  今日动态
                  <span className="card-subtitle">实时业务数据</span>
                </div>
              }
              bordered={false}
            >
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <div className="mini-stat">
                    <div className="mini-stat-icon" style={{ background: '#f6ffed', color: '#52c41a' }}>
                      <PlusOutlined />
                    </div>
                    <div className="mini-stat-content">
                      <div className="mini-stat-value">{stats.todayCreate}</div>
                      <div className="mini-stat-label">新增骑手</div>
                    </div>
                  </div>
                </Col>
                <Col span={6}>
                  <div className="mini-stat">
                    <div className="mini-stat-icon" style={{ background: '#f9f0ff', color: '#722ed1' }}>
                      <ImportOutlined />
                    </div>
                    <div className="mini-stat-content">
                      <div className="mini-stat-value">{stats.todayImport}</div>
                      <div className="mini-stat-label">导入次数</div>
                    </div>
                  </div>
                </Col>
                <Col span={6}>
                  <div className="mini-stat">
                    <div className="mini-stat-icon" style={{ background: '#fff7e6', color: '#faad14' }}>
                      <EditOutlined />
                    </div>
                    <div className="mini-stat-content">
                      <div className="mini-stat-value">{stats.todayUpdate}</div>
                      <div className="mini-stat-label">更新操作</div>
                    </div>
                  </div>
                </Col>
                <Col span={6}>
                  <div className="mini-stat">
                    <div className="mini-stat-icon" style={{ background: '#fff1f0', color: '#f5222d' }}>
                      <DeleteOutlined />
                    </div>
                    <div className="mini-stat-content">
                      <div className="mini-stat-value">{stats.todayDelete}</div>
                      <div className="mini-stat-label">删除操作</div>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* 快捷操作区 - 已移除所有按钮 */}
            </Card>
          </Col>

          {/* 右侧：最近操作日志 */}
          <Col span={8}>
            <Card 
              className="dashboard-card logs-card"
              title={
                <div className="card-title">
                  <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  最近操作
                  <Button type="link" size="small" onClick={() => navigate('/logs')} style={{ marginLeft: 'auto' }}>
                    查看更多
                  </Button>
                </div>
              }
              bordered={false}
            >
              <List
                size="small"
                dataSource={recentLogs.slice(0, 6)}
                split={false}
                className="logs-list"
                renderItem={item => (
                  <List.Item 
                    style={{ padding: '10px 0', cursor: 'pointer' }}
                    onClick={() => handleLogClick(item)}
                    className="log-item"
                  >
                    <div className="log-content">
                      <div className="log-header">
                        <span className="log-operator">{item.operator}</span>
                        <Tag
                          size="small"
                          color={item.result === '成功' ? '#52c41a' : '#ff4d4f'}
                          style={{ borderRadius: '4px', fontSize: '11px', marginLeft: 8 }}
                        >
                          {item.result}
                        </Tag>
                      </div>
                      <div className="log-type">{item.type}</div>
                      <div className="log-desc">{item.content}</div>
                      <div className="log-time">{item.timestamp}</div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 第三行：系统公告 + 快速链接 - 分栏布局 */}
      <div className="dashboard-section">
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Card 
              className="dashboard-card"
              title={
                <div className="card-title">
                  <span style={{ marginRight: 8 }}>📢</span>
                  系统公告
                </div>
              }
              bordered={false}
            >
              <div className="announcement-content">
                <div className="announcement-main">
                  <h4 className="announcement-title">欢迎使用骑手花名册管理系统 V2.0</h4>
                  <p className="announcement-desc">
                    本次更新优化了首页布局，增加了实时数据监控、快捷操作入口，提升了系统的易用性和信息展示效率。
                  </p>
                  <div className="feature-list">
                    <div className="feature-item">
                      <span className="feature-icon">✓</span>
                      <span>多城市站点管理支持</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-icon">✓</span>
                      <span>Excel 批量导入导出</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-icon">✓</span>
                      <span>完整的权限管理体系</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-icon">✓</span>
                      <span>操作日志全程记录</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card 
              className="dashboard-card quick-links-card"
              title={
                <div className="card-title">
                  <span style={{ marginRight: 8 }}>🔗</span>
                  快速链接
                </div>
              }
              bordered={false}
            >
              <div className="quick-links">
                <div className="quick-link-item" onClick={() => navigate('/riders')}>
                  <div className="quick-link-icon" style={{ background: '#e6f7ff', color: '#1890ff' }}>
                    <TeamOutlined />
                  </div>
                  <div className="quick-link-text">
                    <div className="quick-link-title">骑手管理</div>
                    <div className="quick-link-desc">查看和管理骑手信息</div>
                  </div>
                </div>
                <div className="quick-link-item" onClick={() => navigate('/permissions')}>
                  <div className="quick-link-icon" style={{ background: '#f6ffed', color: '#52c41a' }}>
                    <UserOutlined />
                  </div>
                  <div className="quick-link-text">
                    <div className="quick-link-title">权限管理</div>
                    <div className="quick-link-desc">用户角色权限配置</div>
                  </div>
                </div>
                <div className="quick-link-item" onClick={() => navigate('/logs')}>
                  <div className="quick-link-icon" style={{ background: '#fff7e6', color: '#faad14' }}>
                    <FileTextOutlined />
                  </div>
                  <div className="quick-link-text">
                    <div className="quick-link-title">操作日志</div>
                    <div className="quick-link-desc">查看系统操作记录</div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;
