import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Select, message } from 'antd';

interface Knowledge {
  id: number;
  name: string;
  type: 'local' | 'web';
  path: string;
  enabled: boolean;
}

export default function KnowledgeManage() {
  const [knowledgeList, setKnowledgeList] = useState<Knowledge[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadKnowledge();
  }, []);

  const loadKnowledge = () => fetch('/api/knowledge/list').then(r => r.json()).then(setKnowledgeList);

  const handleSave = async () => {
    await form.validateFields();
    const values = form.getFieldsValue();
    await fetch('/api/knowledge/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    }).then(r => r.json());
    setModalVisible(false);
    loadKnowledge();
  };

  const handleSync = async (id: number) => {
    const result = await fetch(`/api/knowledge/sync/${id}`, { method: 'POST' }).then(r => r.json());
    if (result.success) {
      message.success('同步成功');
    } else {
      message.error('同步失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => { form.resetFields(); setModalVisible(true); }}>+ 新增知识库</Button>
      <Table dataSource={knowledgeList} rowKey="id" style={{ marginTop: 16 }}>
        <Table.Column title="名称" dataIndex="name" />
        <Table.Column title="类型" dataIndex="type" render={(v: string) => v === 'local' ? '本地' : '网页'} />
        <Table.Column title="路径/URL" dataIndex="path" />
        <Table.Column title="启用" dataIndex="enabled" render={(v: boolean) => <Switch checked={v} disabled />} />
        <Table.Column title="操作" render={(_, record: Knowledge) => (
          <>
            <Button onClick={() => { form.setFieldsValue(record); setModalVisible(true); }} style={{ marginRight: 8 }}>编辑</Button>
            <Button onClick={() => handleSync(record.id)}>同步</Button>
          </>
        )} />
      </Table>
      <Modal open={modalVisible} onOk={handleSave} onCancel={() => setModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="local">本地</Select.Option>
              <Select.Option value="web">网页</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="path" label="路径/URL" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
