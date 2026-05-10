import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Switch, InputNumber } from 'antd';
import { skillApi } from '../services/api';

interface Task {
  id: number;
  name: string;
  cron: string;
  skill_id: number;
  params: string;
  enabled: boolean;
}

export default function TaskManage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadTasks();
    loadSkills();
  }, []);

  const loadTasks = () => fetch('/api/task/list').then(r => r.json()).then(setTasks);
  const loadSkills = () => skillApi.list().then(setSkills);

  const handleSave = async () => {
    await form.validateFields();
    const values = form.getFieldsValue();
    await fetch('/api/task/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    }).then(r => r.json());
    setModalVisible(false);
    loadTasks();
  };

  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => { form.resetFields(); setModalVisible(true); }}>+ 新增定时任务</Button>
      <Table dataSource={tasks} rowKey="id" style={{ marginTop: 16 }}>
        <Table.Column title="名称" dataIndex="name" />
        <Table.Column title="Cron" dataIndex="cron" />
        <Table.Column title="Skill ID" dataIndex="skill_id" />
        <Table.Column title="参数" dataIndex="params" />
        <Table.Column title="启用" dataIndex="enabled" render={(v: boolean) => <Switch checked={v} disabled />} />
        <Table.Column title="操作" render={(_, record: Task) => (
          <Button onClick={() => { form.setFieldsValue(record); setModalVisible(true); }}>编辑</Button>
        )} />
      </Table>
      <Modal open={modalVisible} onOk={handleSave} onCancel={() => setModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="cron" label="Cron 表达式" rules={[{ required: true }]}><Input placeholder="0 * * * *" /></Form.Item>
          <Form.Item name="skill_id" label="Skill" rules={[{ required: true }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name="params" label="参数(JSON)"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
