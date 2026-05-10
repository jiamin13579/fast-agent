import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Switch } from 'antd';
import { skillApi } from '../services/api';

export default function SkillManage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = () => skillApi.list().then(setSkills);

  const handleSave = async () => {
    await form.validateFields();
    const values = form.getFieldsValue();
    await skillApi.save(values);
    setModalVisible(false);
    loadSkills();
  };

  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => { form.resetFields(); setModalVisible(true); }}>+ 新增 Skill</Button>
      <Table dataSource={skills} rowKey="id" style={{ marginTop: 16 }}>
        <Table.Column title="名称" dataIndex="name" />
        <Table.Column title="描述" dataIndex="description" />
        <Table.Column title="启用" dataIndex="enabled" render={(v: boolean) => <Switch checked={v} disabled />} />
        <Table.Column title="操作" render={(_, record) => (
          <Button onClick={() => { form.setFieldsValue(record); setModalVisible(true); }}>编辑</Button>
        )} />
      </Table>
      <Modal open={modalVisible} onOk={handleSave} onCancel={() => setModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input /></Form.Item>
          <Form.Item name="tools" label="工具定义(JSON)"><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
