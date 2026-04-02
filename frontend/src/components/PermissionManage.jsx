import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Tabs, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { createRole, createUser, deleteRole, deleteUser, getPermissions, getRoles, getUsers, updateRole, updateUser } from '../api';

const { TabPane } = Tabs;
const { Option } = Select;

const PermissionManage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // 用户表单
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userForm] = Form.useForm();
  const [editingUser, setEditingUser] = useState(null);

  // 角色表单
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [roleForm] = Form.useForm();
  const [editingRole, setEditingRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, rolesRes, permissionsRes] = await Promise.all([
          getUsers(),
          getRoles(),
          getPermissions()
        ]);
        setUsers(usersRes.data.users || []);
        setRoles(rolesRes.data.roles || []);
        setPermissions(permissionsRes.data.permissions || []);
        setPagination(prev => ({ ...prev, total: usersRes.data.users?.length || 0 }));
      } catch (error) {
        message.error('获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize]);

  // ========== 用户管理 ==========
  const handleAddUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    setUserModalVisible(true);
  };

  const handleEditUser = (record) => {
    setEditingUser(record);
    userForm.setFieldsValue(record);
    setUserModalVisible(true);
  };

  const handleDeleteUser = async (id) => {
    try {
      await deleteUser(id);
      message.success('删除成功');
      // 刷新数据
      const [usersRes, rolesRes, permissionsRes] = await Promise.all([
        getUsers(),
        getRoles(),
        getPermissions()
      ]);
      setUsers(usersRes.data.users);
      setRoles(rolesRes.data.roles);
      setPermissions(permissionsRes.data.permissions);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleUserSubmit = async () => {
    try {
      const values = await userForm.validateFields();
      if (editingUser) {
        await updateUser(editingUser.id, values);
        message.success('更新成功');
      } else {
        await createUser(values);
        message.success('创建成功');
      }
      setUserModalVisible(false);
      // 刷新数据
      const [usersRes, rolesRes, permissionsRes] = await Promise.all([
        getUsers(),
        getRoles(),
        getPermissions()
      ]);
      setUsers(usersRes.data.users);
      setRoles(rolesRes.data.roles);
      setPermissions(permissionsRes.data.permissions);
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  // ========== 角色管理 ==========
  const handleAddRole = () => {
    setEditingRole(null);
    setSelectedPermissions([]);
    roleForm.resetFields();
    setRoleModalVisible(true);
  };

  const handleEditRole = (record) => {
    setEditingRole(record);
    setSelectedPermissions(record.permissions);
    roleForm.setFieldsValue(record);
    setRoleModalVisible(true);
  };

  const handleDeleteRole = async (id) => {
    try {
      await deleteRole(id);
      message.success('删除成功');
      // 刷新数据
      const [usersRes, rolesRes, permissionsRes] = await Promise.all([
        getUsers(),
        getRoles(),
        getPermissions()
      ]);
      setUsers(usersRes.data.users);
      setRoles(rolesRes.data.roles);
      setPermissions(permissionsRes.data.permissions);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleRoleSubmit = async () => {
    try {
      const values = await roleForm.validateFields();
      values.permissions = selectedPermissions;
      if (editingRole) {
        await updateRole(editingRole.id, values);
        message.success('更新成功');
      } else {
        await createRole(values);
        message.success('创建成功');
      }
      setRoleModalVisible(false);
      // 刷新数据
      const [usersRes, rolesRes, permissionsRes] = await Promise.all([
        getUsers(),
        getRoles(),
        getPermissions()
      ]);
      setUsers(usersRes.data.users);
      setRoles(rolesRes.data.roles);
      setPermissions(permissionsRes.data.permissions);
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  // 按模块分组权限
  const permissionsByModule = (permissions || []).reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  const userColumns = [
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    { title: '角色', dataIndex: 'roleId', key: 'roleId', width: 120, render: (roleId) => {
      const role = roles.find(r => r.id === roleId);
      return role?.name || roleId;
    }},
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (status) => (
      <Tag color={status === 'active' ? '#52c41a' : '#ff4d4f'} style={{ borderRadius: '4px' }}>
        {status === 'active' ? '启用' : '禁用'}
      </Tag>
    )},
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
    { title: '最后登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => handleEditUser(record)}>编辑</Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDeleteUser(record.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const roleColumns = [
    { title: '角色名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '权限数量', dataIndex: 'permissions', key: 'permissions', width: 100, render: (perms) => perms?.length || 0 },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => handleEditRole(record)}>编辑</Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDeleteRole(record.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const permissionColumns = [
    { title: '权限名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '权限ID', dataIndex: 'id', key: 'id', width: 200 },
    { title: '所属模块', dataIndex: 'module', key: 'module', width: 120 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" style={{ flex: 1 }}>
        <TabPane tab="用户管理" key="users">
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 20px' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
                新增用户
              </Button>
            </Card>
            <Table
              columns={userColumns}
              dataSource={users}
              rowKey="id"
              loading={loading}
              scroll={{ x: 900 }}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `共 ${total} 条`,
                position: ['bottomCenter']
              }}
              onChange={handleTableChange}
            />
          </div>
        </TabPane>

        <TabPane tab="角色管理" key="roles">
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 20px' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRole}>
                新增角色
              </Button>
            </Card>
            <Table
              columns={roleColumns}
              dataSource={roles}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `共 ${total} 条`,
                position: ['bottomCenter']
              }}
            />
          </div>
        </TabPane>

        <TabPane tab="权限列表" key="permissions">
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Table
              columns={permissionColumns}
              dataSource={permissions}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `共 ${total} 条`,
                position: ['bottomCenter']
              }}
            />
          </div>
        </TabPane>
      </Tabs>

      {/* 用户表单弹窗 */}
      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={userModalVisible}
        onOk={handleUserSubmit}
        onCancel={() => setUserModalVisible(false)}
      >
        <Form form={userForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input disabled={editingUser} />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label={editingUser ? '密码（留空不修改）' : '密码'} rules={editingUser ? [] : [{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="roleId" label="角色" rules={[{ required: true }]}>
            <Select>
              {roles.map(role => (
                <Option key={role.id} value={role.id}>{role.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select>
              <Option value="active">启用</Option>
              <Option value="disabled">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 角色表单弹窗 */}
      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={roleModalVisible}
        onOk={handleRoleSubmit}
        onCancel={() => setRoleModalVisible(false)}
        width={600}
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item name="name" label="角色名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea />
          </Form.Item>
          <Form.Item label="权限">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
              <div key={module} style={{ marginBottom: 16 }}>
                <h4>{module}</h4>
                <Checkbox.Group
                  options={perms.map(p => ({ label: p.name, value: p.id }))}
                  value={selectedPermissions}
                  onChange={setSelectedPermissions}
                />
              </div>
            ))}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PermissionManage;
