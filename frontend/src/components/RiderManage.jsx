import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Upload
} from 'antd';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import { createRider, deleteAllRiders, deleteRider, exportRiders, getRiders, getStations, importRiders, updateRider } from '../api';
import RiderForm from './RiderForm';

const { Option } = Select;
const { RangePicker } = DatePicker;

const RiderManage = ({ permissions }) => {
  const [riders, setRiders] = useState([]);
  const [stations, setStations] = useState({});
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedStation, setSelectedStation] = useState('all');
  const [filteredStations, setFilteredStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingRider, setEditingRider] = useState(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchType, setSearchType] = useState('name');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  // 模拟趋势数据
  const [trends] = useState({
    total: { value: 12.5, up: true },
    active: { value: 8.3, up: true },
    fullTime: { value: 5.2, up: true },
    ratio: { value: 2.1, up: false }
  });

  // 请求取消控制器
  const abortController = useRef(null);
  // 数据缓存
  const dataCache = useRef({});
  // 当前请求参数缓存
  const currentParams = useRef(null);
  // 请求锁
  const isRequesting = useRef(false);

  // 生成缓存key
  const getCacheKey = (params) => {
    return JSON.stringify(params);
  };

  // 获取骑手数据
  const fetchRiders = async () => {
    // 如果正在请求中，直接返回
    if (isRequesting.current) {
      return;
    }

    // 取消之前的请求
    if (abortController.current) {
      abortController.current.abort();
    }

    // 创建新的取消控制器
    abortController.current = new AbortController();

    isRequesting.current = true;
    setLoading(true);

    try {
      const params = {};
      if (selectedCity !== 'all') params.city = selectedCity;
      if (selectedStation !== 'all') params.station = selectedStation;
      if (dateRange && dateRange[0]) params.startDate = dateRange[0].format('YYYY-MM-DD');
      if (dateRange && dateRange[1]) params.endDate = dateRange[1].format('YYYY-MM-DD');

      // 保存当前参数
      currentParams.current = params;

      // 检查缓存
      const cacheKey = getCacheKey(params);
      let data = dataCache.current[cacheKey];

      if (!data) {
        // 无缓存则请求接口
        const response = await getRiders(params, abortController.current.signal);
        data = response.data.riders || [];
        dataCache.current[cacheKey] = data;
      }

      if (searchKeyword.trim()) {
        const keyword = searchKeyword.trim().toLowerCase();
        if (searchType === 'name') {
          data = data.filter(r => r.name && r.name.toLowerCase().includes(keyword));
        } else if (searchType === 'riderId') {
          data = data.filter(r => r.riderId && r.riderId.toLowerCase().includes(keyword));
        }
      }

      setRiders(data);
      setPagination(prev => ({ ...prev, total: data.length }));
    } catch (error) {
      // 如果是取消请求，不显示错误
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        message.error('获取骑手数据失败，请重试');
      }
    } finally {
      isRequesting.current = false;
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await getStations();
        setStations(response.data.stations);
        setCities(Object.keys(response.data.stations));
      } catch (error) {
        message.error('获取站点数据失败');
      }
    };

    fetchStations();
    fetchRiders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    fetchRiders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedStation, pagination.current, pagination.pageSize]);

  const hasPermission = (permissionId) => permissions.includes(permissionId);

  const handleAdd = () => {
    setEditingRider(null);
    setFormVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRider(record);
    setFormVisible(true);
  };

  const handleDelete = async (riderId) => {
    try {
      await deleteRider(riderId);
      message.success('删除成功');
      fetchRiders();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleDeleteAll = async () => {
    try {
      const response = await deleteAllRiders();
      message.success(response.data.message);
      fetchRiders();
    } catch (error) {
      message.error('删除所有数据失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleFormSubmit = async (values) => {
    try {
      if (editingRider) {
        await updateRider(editingRider.riderId, values);
        message.success('更新成功');
      } else {
        await createRider(values);
        message.success('添加成功');
      }
      setFormVisible(false);
      setEditingRider(null);
      fetchRiders();
    } catch (error) {
      message.error(error.response?.data?.errors?.[0] || '操作失败');
    }
  };

  const handleImport = async (file) => {
    try {
      const response = await importRiders(file);
      setImportResult(response.data.results);
      setImportModalVisible(true);
      fetchRiders();
      return false;
    } catch (error) {
      message.error('导入失败：' + (error.response?.data?.errors?.[0] || error.message));
      return false;
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (selectedCity !== 'all') params.city = selectedCity;
      if (selectedStation !== 'all') params.station = selectedStation;
      await exportRiders(params);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 搜索防抖定时器
  const searchDebounceTimer = useRef(null);

  const handleSearch = () => {
    // 清除之前的定时器
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // 设置新的防抖定时器（500ms）
    searchDebounceTimer.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchRiders();
    }, 500);
  };

  // 实时搜索（输入时防抖）
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchKeyword(value);

    // 清除之前的定时器
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // 输入为空时立即搜索，否则防抖 500ms
    if (!value.trim()) {
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchRiders();
    } else {
      searchDebounceTimer.current = setTimeout(() => {
        setPagination(prev => ({ ...prev, current: 1 }));
        fetchRiders();
      }, 500);
    }
  };

  const handleReset = () => {
    setSelectedCity('all');
    setSelectedStation('all');
    setDateRange(null);
    setSearchKeyword('');
    setSearchType('name');
    setPagination({ current: 1, pageSize: 10 });
    setTimeout(fetchRiders, 0);
  };

  // 重置表格滚动位置
  const resetTableScroll = () => {
    const tableBody = document.querySelector('.rider-manage-container .ant-table-body');
    if (tableBody) {
      tableBody.scrollTop = 0;
    }
  };

  const handleTableChange = (page, pageSize) => {
    // 如果正在请求中，直接返回
    if (isRequesting.current) {
      return;
    }

    // 如果 pageSize 变化，重置到第1页
    const newPage = pageSize !== pagination.pageSize ? 1 : page;

    // 立即更新分页状态（无延迟）
    setPagination(prev => ({ ...prev, current: newPage, pageSize }));

    // 重置滚动位置
    resetTableScroll();
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(Date.UTC(1900, 0, 0));
      const daysToSubtract = dateValue > 60 ? 2 : 1;
      const date = new Date(excelEpoch.getTime() + (dateValue - daysToSubtract) * 24 * 60 * 60 * 1000);
      return moment(date).format('YYYY/MM/DD');
    }
    if (typeof dateValue === 'string') {
      if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(dateValue)) {
        return dateValue.replace(/-/g, '/');
      }
      const date = moment(dateValue);
      if (date.isValid()) return date.format('YYYY/MM/DD');
    }
    return String(dateValue);
  };

  const getStatusTag = (status) => status === '在职'
    ? <Tag color="success" style={{ fontWeight: 600, fontSize: '13px', padding: '2px 8px' }}>在职</Tag>
    : <Tag color="error" style={{ fontWeight: 600, fontSize: '13px', padding: '2px 8px' }}>离职</Tag>;
  const getRiderStatusTag = (status) => {
    const map = { '正常在职': 'green', '死号未删': 'orange', '已离职删号': 'red' };
    return <Tag color={map[status] || 'default'}>{status || '-'}</Tag>;
  };

  const columns = [
    {
      title: '骑手ID',
      dataIndex: 'riderId',
      key: 'riderId',
      width: 110,
      fixed: 'left',
      align: 'right',
      ellipsis: true
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 90,
      fixed: 'left',
      align: 'left'
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 115,
      fixed: 'left',
      align: 'right'
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 180,
      fixed: 'left',
      align: 'left',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 70,
      align: 'center',
      render: getStatusTag
    },
    {
      title: '骑手状态',
      dataIndex: 'riderStatus',
      key: 'riderStatus',
      width: 90,
      align: 'center',
      render: getRiderStatusTag
    },
    {
      title: '入职时间',
      dataIndex: 'entryDate',
      key: 'entryDate',
      width: 110,
      align: 'center',
      render: formatDate
    },
    {
      title: '入职性质',
      dataIndex: 'employmentType',
      key: 'employmentType',
      width: 75,
      align: 'center'
    },
    {
      title: '入职来源',
      dataIndex: 'employmentSource',
      key: 'employmentSource',
      width: 90,
      align: 'left',
      ellipsis: true,
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>--</span>
    },
    {
      title: '推荐人',
      dataIndex: 'referrer',
      key: 'referrer',
      width: 80,
      align: 'left',
      ellipsis: true,
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>--</span>
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 75,
      align: 'right',
      render: (t) => t ? `${t}元` : <span style={{ color: '#bfbfbf' }}>--</span>
    },
    {
      title: '结算频率',
      dataIndex: 'settlementFrequency',
      key: 'settlementFrequency',
      width: 85,
      align: 'center',
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>--</span>
    },
    {
      title: '调整记录',
      dataIndex: 'adjustmentInfo',
      key: 'adjustmentInfo',
      width: 150,
      align: 'left',
      ellipsis: true,
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>--</span>
    },
    {
      title: '银行卡',
      dataIndex: 'hasBankCard',
      key: 'hasBankCard',
      width: 70,
      align: 'center',
      render: (t) => <Tag color={t === '是' ? 'green' : 'default'} size="small">{t || '否'}</Tag>
    },
    {
      title: '宿舍',
      dataIndex: 'hasDormitory',
      key: 'hasDormitory',
      width: 60,
      align: 'center',
      render: (t) => <Tag color={t === '是' ? 'green' : 'default'} size="small">{t || '否'}</Tag>
    },
    {
      title: '租车',
      dataIndex: 'hasCompanyRental',
      key: 'hasCompanyRental',
      width: 60,
      align: 'center',
      render: (t) => <Tag color={t === '是' ? 'green' : 'default'} size="small">{t || '否'}</Tag>
    },
    {
      title: '头盔',
      dataIndex: 'helmetCount',
      key: 'helmetCount',
      width: 55,
      align: 'center',
      render: (t) => t || '0'
    },
    {
      title: '制服',
      dataIndex: 'uniformCount',
      key: 'uniformCount',
      width: 55,
      align: 'center',
      render: (t) => t || '0'
    },
    {
      title: '餐箱',
      dataIndex: 'foodBoxCount',
      key: 'foodBoxCount',
      width: 55,
      align: 'center',
      render: (t) => t || '0'
    },
    {
      title: '合同',
      dataIndex: 'hasContract',
      key: 'hasContract',
      width: 70,
      align: 'center',
      render: (t) => <Tag color={t === '已签' ? 'green' : 'red'} size="small">{t || '未签'}</Tag>
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 120,
      align: 'left',
      ellipsis: true,
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>--</span>
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space size={8}>
          {hasPermission('rider_edit') && (
            <Tooltip title="编辑">
              <Button
                type="primary"
                ghost
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEdit(record)}
                style={{ minWidth: '32px', height: '28px' }}
              />
            </Tooltip>
          )}
          {hasPermission('rider_delete') && (
            <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record.riderId)}>
              <Tooltip title="删除">
                <Button
                  danger
                  ghost
                  icon={<DeleteOutlined />}
                  size="small"
                  style={{ minWidth: '32px', height: '28px' }}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // 统计数据计算
  const activeRiders = riders.filter(r => r.status === '在职').length;
  const activeFullTimeRiders = riders.filter(r => r.status === '在职' && r.employmentType === '全职').length;
  const fullTimeRatio = activeRiders > 0 ? Math.round((activeFullTimeRiders / activeRiders) * 100) : 0;

  const getTrendIcon = (up) => up ? <ArrowUpOutlined style={{ color: '#52c41a', fontSize: 12 }} /> : <ArrowDownOutlined style={{ color: '#f5222d', fontSize: 12 }} />;

  return (
    <div className="rider-manage-container">
      {/* 统计卡片区 - 紧凑布局 */}
      <div className="stats-section">
        <Row gutter={16}>
          <Col span={6}>
            <Card className="stat-card" bordered={false}>
              <div className="stat-header">
                <TeamOutlined className="stat-icon" />
                <span className="stat-trend">
                  {getTrendIcon(trends.total.up)} {trends.total.value}%
                </span>
              </div>
              <div className="stat-value">{riders.length}</div>
              <div className="stat-label">总骑手数</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card" bordered={false}>
              <div className="stat-header">
                <CheckCircleOutlined className="stat-icon" style={{ color: '#52c41a' }} />
                <span className="stat-trend">
                  {getTrendIcon(trends.active.up)} {trends.active.value}%
                </span>
              </div>
              <div className="stat-value" style={{ color: '#52c41a' }}>{activeRiders}</div>
              <div className="stat-label">在职骑手</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card" bordered={false}>
              <div className="stat-header">
                <UserOutlined className="stat-icon" style={{ color: '#1890ff' }} />
                <span className="stat-trend">
                  {getTrendIcon(trends.fullTime.up)} {trends.fullTime.value}%
                </span>
              </div>
              <div className="stat-value" style={{ color: '#1890ff' }}>{activeFullTimeRiders}</div>
              <div className="stat-label">在职全职骑手</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card" bordered={false}>
              <div className="stat-header">
                <span className="stat-title">在职全职占比</span>
              </div>
              <div className="stat-value-lg" style={{ color: '#722ed1' }}>
                {fullTimeRatio}<span className="stat-suffix">%</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${fullTimeRatio}%` }}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 筛选与操作区 - 优化布局 */}
      <Card className="filter-section" bordered={false}>
        <div className="filter-toolbar">
          <div className="filter-left">
            {/* 第一行：核心筛选条件 */}
            <div className="filter-row">
              <Select
                className="filter-item"
                style={{ width: 100 }}
                value={selectedCity}
                onChange={setSelectedCity}
                size="middle"
                placeholder="选择城市"
              >
                <Option value="all">全部城市</Option>
                {cities.map(c => <Option key={c} value={c}>{c}</Option>)}
              </Select>
              <Select
                className="filter-item"
                style={{ width: 140 }}
                value={selectedStation}
                onChange={setSelectedStation}
                disabled={selectedCity === 'all'}
                size="middle"
                placeholder="选择站点"
              >
                <Option value="all">全部站点</Option>
                {filteredStations.map(s => <Option key={s} value={s}>{s}</Option>)}
              </Select>
              <Dropdown
                dropdownRender={() => (
                  <div style={{ padding: 16, background: '#fff', borderRadius: 8, boxShadow: '0 6px 16px rgba(0,0,0,0.12)' }}>
                    <div style={{ padding: '8px 0' }}>
                      <span style={{ display: 'block', marginBottom: 8, color: '#666' }}>入职日期范围</span>
                      <RangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        style={{ width: 260 }}
                        getPopupContainer={(trigger) => trigger.parentNode}
                        placeholder={['开始日期', '结束日期']}
                      />
                    </div>
                  </div>
                )}
                open={showAdvancedFilter}
                onOpenChange={setShowAdvancedFilter}
              >
                <Button
                  size="middle"
                  icon={<SearchOutlined />}
                  type={dateRange ? 'primary' : 'default'}
                >
                  高级筛选{dateRange ? '(已选)' : ''}
                </Button>
              </Dropdown>
            </div>

            {/* 第二行：搜索条件 */}
            <div className="filter-row" style={{ marginTop: 12 }}>
              <Input.Group compact style={{ display: 'flex', width: 'auto' }}>
                <Select
                  value={searchType}
                  onChange={setSearchType}
                  size="middle"
                  style={{ width: 80 }}
                >
                  <Option value="name">姓名</Option>
                  <Option value="riderId">骑手ID</Option>
                </Select>
                <Input
                  placeholder="请输入关键词搜索"
                  value={searchKeyword}
                  onChange={handleSearchInputChange}
                  onPressEnter={handleSearch}
                  style={{ width: 200 }}
                  size="middle"
                  allowClear
                />
              </Input.Group>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                size="middle"
                style={{ marginLeft: 8 }}
              >
                查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                size="middle"
                style={{ marginLeft: 8 }}
              >
                重置
              </Button>
            </div>
          </div>
          <div className="filter-right">
            {hasPermission('rider_create') && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                size="middle"
              >
                新增骑手
              </Button>
            )}
            {hasPermission('rider_import') && (
              <Upload
                beforeUpload={handleImport}
                showUploadList={false}
                accept=".xlsx,.xls"
              >
                <Button
                  icon={<UploadOutlined />}
                  size="middle"
                  style={{ marginLeft: 8 }}
                >
                  导入
                </Button>
              </Upload>
            )}
            {hasPermission('rider_export') && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                size="middle"
                style={{ marginLeft: 8 }}
              >
                导出
              </Button>
            )}
            {hasPermission('rider_delete_all') && (
              <Popconfirm
                title="警告"
                description="确定要删除所有骑手数据吗？此操作不可恢复！"
                onConfirm={handleDeleteAll}
                okText="确定删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
              >
                <Button
                  danger
                  ghost
                  icon={<DeleteOutlined />}
                  size="middle"
                  style={{ marginLeft: 8 }}
                >
                  删除所有
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      </Card>

      {/* 表格区 */}
      <Card className="table-section" bordered={false}>
        {/* 顶部轻量进度条 */}
        {loading && <div className="table-progress-bar" />}

        <Table
          columns={columns}
          dataSource={riders}
          rowKey="riderId"
          loading={false}
          scroll={{ x: 1800 }}
          sticky
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `共 ${total} 条数据`,
            position: ['bottomCenter'],
            onChange: handleTableChange,
            disabled: loading
          }}
        />
      </Card>

      <RiderForm
        open={formVisible}
        onCancel={() => { setFormVisible(false); setEditingRider(null); }}
        onSubmit={handleFormSubmit}
        initialValues={editingRider}
        stations={stations}
        cities={cities}
      />

      <Modal
        title="导入结果"
        open={importModalVisible}
        onOk={() => setImportModalVisible(false)}
        onCancel={() => setImportModalVisible(false)}
        width={600}
      >
        {importResult && (
          <div>
            <p><strong style={{ color: 'green' }}>导入成功：</strong>{importResult.success} 条</p>
            <p><strong style={{ color: 'red' }}>导入失败：</strong>{importResult.failed} 条</p>
            {importResult.warnings?.length > 0 && (
              <div style={{ maxHeight: 150, overflow: 'auto', marginTop: 16, padding: 8, backgroundColor: '#fffbe6', borderRadius: 4 }}>
                <p><strong style={{ color: '#faad14' }}>警告信息：</strong></p>
                <ul>{importResult.warnings.map((w, i) => <li key={i} style={{ color: '#d48806', fontSize: 12 }}>{w}</li>)}</ul>
              </div>
            )}
            {importResult.errors?.length > 0 && (
              <div style={{ maxHeight: 150, overflow: 'auto', marginTop: 16, padding: 8, backgroundColor: '#fff2f0', borderRadius: 4 }}>
                <p><strong style={{ color: 'red' }}>错误信息：</strong></p>
                <ul>{importResult.errors.map((e, i) => <li key={i} style={{ color: 'red', fontSize: 12 }}>{e}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RiderManage;
