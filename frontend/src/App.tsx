import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Chat from './pages/Chat';
import SkillManage from './pages/SkillManage';
import McpManage from './pages/McpManage';
import TaskManage from './pages/TaskManage';
import KnowledgeManage from './pages/KnowledgeManage';
import { Layout, Menu } from 'antd';
import { MessageOutlined, ToolOutlined, CloudOutlined, ClockCircleOutlined, BookOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

export default function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider>
          <Menu theme="dark" mode="inline" defaultSelectedKeys={['chat']}>
            <Menu.Item key="chat" icon={<MessageOutlined />}><a href="/">聊天</a></Menu.Item>
            <Menu.Item key="skills" icon={<ToolOutlined />}><a href="/skills">Skill管理</a></Menu.Item>
            <Menu.Item key="mcp" icon={<CloudOutlined />}><a href="/mcp">MCP管理</a></Menu.Item>
            <Menu.Item key="tasks" icon={<ClockCircleOutlined />}><a href="/tasks">定时任务</a></Menu.Item>
            <Menu.Item key="knowledge" icon={<BookOutlined />}><a href="/knowledge">知识库</a></Menu.Item>
          </Menu>
        </Sider>
        <Layout>
          <Content style={{ padding: 24 }}>
            <Routes>
              <Route path="/" element={<Chat />} />
              <Route path="/skills" element={<SkillManage />} />
              <Route path="/mcp" element={<McpManage />} />
              <Route path="/tasks" element={<TaskManage />} />
              <Route path="/knowledge" element={<KnowledgeManage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  );
}
