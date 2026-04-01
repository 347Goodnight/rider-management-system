import { DatePicker, Form, Input, InputNumber, Modal, Select, Switch, message } from 'antd';
import moment from 'moment';
import { useEffect, useState } from 'react';

const { Option } = Select;
const { TextArea } = Input;

const RiderForm = ({ open, onCancel, onSubmit, initialValues, stations }) => {
  const [form] = Form.useForm();
  const [allStations, setAllStations] = useState([]);

  useEffect(() => {
    if (open) {
      // 收集所有站点
      const stationsList = [];
      Object.values(stations).forEach(cityStations => {
        if (Array.isArray(cityStations)) {
          stationsList.push(...cityStations);
        }
      });
      setAllStations(stationsList);

      if (initialValues) {
        const values = { ...initialValues };
        if (values.entryDate) {
          values.entryDate = moment(values.entryDate);
        }
        if (values.adjustmentTime) {
          values.adjustmentTime = moment(values.adjustmentTime);
        }
        
        form.setFieldsValue(values);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form, stations]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = { ...values };
      
      if (values.entryDate) {
        formattedValues.entryDate = values.entryDate.format('YYYY-MM-DD');
      }
      if (values.adjustmentTime) {
        formattedValues.adjustmentTime = values.adjustmentTime.format('YYYY-MM-DD HH:mm:ss');
      }
      
      formattedValues.hasBankCard = values.hasBankCard ? '是' : '否';
      formattedValues.hasDormitory = values.hasDormitory ? '是' : '否';
      formattedValues.hasCompanyRental = values.hasCompanyRental ? '是' : '否';
      formattedValues.hasContract = values.hasContract ? '已签' : '未签';
      
      // 数量字段转为字符串
      formattedValues.helmetCount = values.helmetCount !== undefined ? String(values.helmetCount) : '0';
      formattedValues.uniformCount = values.uniformCount !== undefined ? String(values.uniformCount) : '0';
      formattedValues.foodBoxCount = values.foodBoxCount !== undefined ? String(values.foodBoxCount) : '0';
      
      onSubmit(formattedValues);
    } catch (error) {
      message.error('请检查表单填写是否正确');
    }
  };

  return (
    <Modal
      title={initialValues ? '编辑骑手' : '新增骑手'}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: '在职',
          riderStatus: '正常在职',
          employmentType: '全职',
          settlementFrequency: '月结',
          hasBankCard: false,
          hasDormitory: false,
          hasCompanyRental: false,
          helmetCount: 0,
          uniformCount: 0,
          foodBoxCount: 0,
          hasContract: false,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="riderId"
            label="骑手ID"
            rules={[{ required: true, message: '请输入骑手ID' }]}
          >
            <Input placeholder="请输入骑手ID" disabled={!!initialValues} />
          </Form.Item>

          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            name="idCard"
            label="身份证"
          >
            <Input placeholder="请输入身份证号" />
          </Form.Item>

          <Form.Item
            name="department"
            label="部门（站点）"
            rules={[{ required: true, message: '请选择部门' }]}
          >
            <Select placeholder="请选择站点">
              {allStations.map(station => (
                <Option key={station} value={station}>{station}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="entryDate"
            label="入职时间"
          >
            <DatePicker style={{ width: '100%' }} placeholder="请选择入职时间" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
          >
            <Select>
              <Option value="在职">在职</Option>
              <Option value="离职">离职</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="riderStatus"
            label="骑手状态"
          >
            <Select placeholder="请选择骑手状态">
              <Option value="正常在职">正常在职</Option>
              <Option value="死号未删">死号未删</Option>
              <Option value="已离职删号">已离职删号</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="employmentType"
            label="骑手入职性质"
          >
            <Select>
              <Option value="全职">全职</Option>
              <Option value="兼职">兼职</Option>
              <Option value="点现">点现</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="employmentSource"
            label="骑手入职来源"
          >
            <Input placeholder="例如：招聘平台、内部推荐" />
          </Form.Item>

          <Form.Item
            name="referrer"
            label="推荐人"
          >
            <Input placeholder="请输入推荐人" />
          </Form.Item>

          <Form.Item
            name="unitPrice"
            label="单价（元/单）"
          >
            <InputNumber style={{ width: '100%' }} min={0} step={0.1} placeholder="例如：5.5" />
          </Form.Item>

          <Form.Item
            name="settlementFrequency"
            label="结算频率"
          >
            <Input placeholder="例如：月结、周结、日结等" />
          </Form.Item>

          <Form.Item
            name="adjustmentInfo"
            label="兼职转全职/全职转兼职/单价调整"
          >
            <Input placeholder="例如：2026-03-20 转为全职，单价调整为 7.5元" />
          </Form.Item>

          <Form.Item
            name="hasBankCard"
            label="是否绑定银行卡"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Form.Item
            name="otherBankCardHolder"
            label="绑定他人银行卡注明"
          >
            <Input placeholder="若绑定他人卡则填写姓名" />
          </Form.Item>

          <Form.Item
            name="hasDormitory"
            label="是否入住公司宿舍"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Form.Item
            name="hasCompanyRental"
            label="是否公司垫付租车"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Form.Item
            name="helmetCount"
            label="头盔数量"
          >
            <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入头盔数量" />
          </Form.Item>

          <Form.Item
            name="uniformCount"
            label="制服数量"
          >
            <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入制服数量" />
          </Form.Item>

          <Form.Item
            name="foodBoxCount"
            label="餐箱数量"
          >
            <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入餐箱数量" />
          </Form.Item>

          <Form.Item
            name="hasContract"
            label="是否签署合同"
            valuePropName="checked"
          >
            <Switch checkedChildren="已签" unCheckedChildren="未签" />
          </Form.Item>
        </div>

        <Form.Item
          name="remark"
          label="备注"
        >
          <TextArea rows={3} placeholder="请输入备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RiderForm;
