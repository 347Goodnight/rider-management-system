import {
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout, Menu, message } from 'antd';
import { useEffect, useState } from 'react';
import { getCurrentUser, logout } from './api';
import './App.css';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import LogManage from './components/LogManage';
import PermissionManage from './components/PermissionManage';
import RiderManage from './components/RiderManage';

const { Header, Sider, Content } = Layout;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedPermissions = localStorage.getItem('permissions');

    if (token && savedUser && savedUser !== 'undefined') {
      try {
        setUser(JSON.parse(savedUser));
        setPermissions(JSON.parse(savedPermissions || '[]'));
        setIsLoggedIn(true);
        // 验证token有效性
        validateToken();
      } catch (error) {
        console.error('解析用户数据失败:', error);
        // 清除无效的登录数据
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async () => {
    try {
      const response = await getCurrentUser();
      setUser(response.data.user);
      setPermissions(response.data.permissions);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('permissions', JSON.stringify(response.data.permissions));
    } catch (error) {
      // token无效，清除登录状态
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    const savedUser = localStorage.getItem('user');
    const savedPermissions = localStorage.getItem('permissions');
    try {
      if (savedUser && savedUser !== 'undefined') {
        setUser(JSON.parse(savedUser));
      }
      if (savedPermissions && savedPermissions !== 'undefined') {
        setPermissions(JSON.parse(savedPermissions));
      } else {
        setPermissions([]);
      }
      setIsLoggedIn(true);
    } catch (error) {
      console.error('解析登录数据失败:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('登出失败:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    setIsLoggedIn(false);
    setUser(null);
    setPermissions([]);
    message.success('已退出登录');
  };

  // 检查是否有权限
  const hasPermission = (permissionId) => {
    return permissions.includes(permissionId);
  };

  // 菜单项配置
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '首页',
      show: true
    },
    {
      key: 'riders',
      icon: <TeamOutlined />,
      label: '骑手管理',
      show: hasPermission('rider_view')
    },
    {
      key: 'permissions',
      icon: <SafetyOutlined />,
      label: '权限管理',
      show: hasPermission('user_view') || hasPermission('role_view')
    },
    {
      key: 'logs',
      icon: <FileTextOutlined />,
      label: '操作日志',
      show: hasPermission('log_view')
    }
  ].filter(item => item.show);

  // 渲染当前页面
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'riders':
        return <RiderManage permissions={permissions} />;
      case 'permissions':
        return <PermissionManage />;
      case 'logs':
        return <LogManage />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.name || user?.username
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>加载中...</div>;
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout className="app-layout">
      {/* 左侧导航栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={200}
        className="app-sider"
      >
        <div className="logo">
          {collapsed ? '骑手' : '骑手管理系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPage]}
          onClick={({ key }) => setCurrentPage(key)}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout className="app-main-layout">
        {/* 顶部Header */}
        <Header className="app-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64, color: '#fff' }}
          />
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-info">
                <Avatar icon={<UserOutlined />} />
                <span className="username">{user?.name || user?.username}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 主内容区 */}
        <Content className="app-content">
          {renderPage()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
