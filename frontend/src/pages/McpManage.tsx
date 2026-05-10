import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Select, message } from 'antd';
import { mcpApi } from '../services/api';

export default function McpManage() {
  const [servers, setServers] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = () => mcpApi.list().then(setServers);

  const handleSave = async () => {
    await form.validateFields();
    const values = form.getFieldsValue();
    await mcpApi.save(values);
    setModalVisible(false);
    loadServers();
  };

  const handleTest = async (id: number) => {
    const result = await mcpApi.test(id);
    if (result.success) {
      message.success('连接成功');
    } else {
      message.error('连接失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => { form.resetFields(); setModalVisible(true); }}>+ 新增 MCP Server</Button>
      <Table dataSource={servers} rowKey="id" style={{ marginTop: 16 }}>
        <Table.Column title="名称" dataIndex="name" />
        <Table.Column title="URL" dataIndex="url" />
        <Table.Column title="认证类型" dataIndex="auth_type" />
        <Table.Column title="启用" dataIndex="enabled" render={(v: boolean) => <Switch checked={v} disabled />} />
        <Table.Column title="操作" render={(_, record) => (
          <>
            <Button onClick={() => { form.setFieldsValue(record); setModalVisible(true); }} style={{ marginRight: 8 }}>编辑</Button>
            <Button onClick={() => handleTest(record.id)}>测试</Button>
          </>
        )} />
      </Table>
      <Modal open={modalVisible} onOk={handleSave} onCancel={() => setModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="url" label="URL" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="auth_type" label="认证类型">
            <Select>
              <Select.Option value="none">无</Select.Option>
              <Select.Option value="bearer">Bearer Token</Select.Option>
              <Select.Option value="api_key">API Key</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="auth_token" label="认证Token"><Input.Password /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
