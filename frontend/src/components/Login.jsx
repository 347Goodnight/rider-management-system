import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, message, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { login } from '../api';
import './Login.css';

const { Title } = Typography;

const Login = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('token');
    if (token) {
      onLogin();
    }
  }, [onLogin]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await login(values.username, values.password);
      const { token, user, permissions } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('permissions', JSON.stringify(permissions));

      message.success('登录成功');
      onLogin();
    } catch (error) {
      message.error(error.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <Title level={2}>骑手花名册管理系统</Title>
          <p>请登录以继续</p>
        </div>
        
        <Form
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
        

      </Card>
    </div>
  );
};

export default Login;
