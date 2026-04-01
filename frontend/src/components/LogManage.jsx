/* eslint-disable */
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Input, message, Select, Space, Table, Tag } from 'antd';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { exportLogs, getLogs } from '../api';

const { RangePicker } = DatePicker;
const { Option } = Select;

const LogManage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    dateRange: null,
    operator: '',
    type: undefined
  });

  const logTypes = ['登录', '登出', '骑手管理', '用户管理', '角色管理', '系统操作'];

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize
      };

      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }
      if (filters.operator) {
        params.operator = filters.operator;
      }
      if (filters.type) {
        params.type = filters.type;
      }

      const response = await getLogs(params);
      setLogs(response.data.logs);
      setPagination({ ...pagination, total: response.data.total });
    } catch (error) {
      message.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    fetchLogs();
  };

  const handleReset = () => {
    setFilters({ dateRange: null, operator: '', type: undefined });
    setPagination({ ...pagination, current: 1 });
    setTimeout(fetchLogs, 0);
  };

  const handleExport = () => {
    const params = {};
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
      params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
    }
    if (filters.operator) {
      params.operator = filters.operator;
    }
    if (filters.type) {
      params.type = filters.type;
    }
    exportLogs(params);
    message.success('开始导出日志');
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  const getResultTag = (result) => {
    return result === '成功' ? (
      <Tag color="#52c41a" style={{ borderRadius: '4px' }}>成功</Tag>
    ) : (
      <Tag color="#ff4d4f" style={{ borderRadius: '4px' }}>失败</Tag>
    );
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      fixed: 'left',
      render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
      fixed: 'left'
    },
    {
      title: '操作类型',
      dataIndex: 'type',
      key: 'type',
      width: 120
    },
    {
      title: '操作内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      minWidth: 200
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      width: 80,
      fixed: 'right',
      render: getResultTag
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 120,
      fixed: 'right'
    }
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '16px 20px' }}>
        <Space wrap size={8}>
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            value={filters.dateRange}
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            style={{ width: 240 }}
          />
          <Input
            placeholder="操作人"
            value={filters.operator}
            onChange={(e) => setFilters({ ...filters, operator: e.target.value })}
            style={{ width: 120 }}
          />
          <Select
            placeholder="操作类型"
            value={filters.type}
            onChange={(value) => setFilters({ ...filters, type: value })}
            style={{ width: 120 }}
            allowClear
          >
            {logTypes.map(type => (
              <Option key={type} value={type}>{type}</Option>
            ))}
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={logs}
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
  );
};

export default LogManage;
