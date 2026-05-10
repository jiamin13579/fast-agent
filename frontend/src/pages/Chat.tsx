import { useState, useEffect } from 'react';
import { ChatContainer, MessageList, MessageInput, Button, Card, List } from 'antd';
import { chatApi } from '../services/api';

interface Message {
  role: string;
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState<number | null>(null);
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    chatApi.list().then((list: any[]) => {
      setChats(list);
      if (list.length > 0) {
        selectChat(list[0].id);
      }
    });
  }, []);

  const selectChat = (id: number) => {
    setChatId(id);
    chatApi.history(id).then((msgs: Message[]) => setMessages(msgs));
  };

  const send = async () => {
    if (!chatId || !input.trim()) return;
    const { response } = await chatApi.send(chatId, input);
    setMessages([...messages, { role: 'user', content: input }, { role: 'assistant', content: response }]);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: 250, borderRight: '1px solid #eee', padding: 16 }}>
        <Button onClick={() => chatApi.create('新会话').then((r: any) => {
          setChats([...chats, r]);
          selectChat(r.chat_id);
        })}>+ 新会话</Button>
        <List
          dataSource={chats}
          renderItem={(item: any) => (
            <List.Item onClick={() => selectChat(item.id)} style={{ cursor: 'pointer' }}>
              {item.name}
            </List.Item>
          )}
        />
      </div>
      <div style={{ flex: 1, padding: 24 }}>
        <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <MessageList style={{ flex: 1 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <span style={{ background: m.role === 'user' ? '#1890ff' : '#f0f0f0', padding: 8, borderRadius: 4, color: m.role === 'user' ? '#fff' : '#000' }}>
                  {m.content}
                </span>
              </div>
            ))}
          </MessageList>
          <div style={{ display: 'flex', gap: 8 }}>
            <MessageInput value={input} onChange={(e: any) => setInput(e.target.value)} onSend={send} />
            <Button onClick={send}>发送</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
