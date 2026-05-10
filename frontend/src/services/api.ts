const API_BASE = '/api';

export const chatApi = {
  send: (chatId: number, content: string) =>
    fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, content })
    }).then(r => r.json()),

  history: (chatId: number) =>
    fetch(`${API_BASE}/chat/history/${chatId}`).then(r => r.json()),

  create: (name: string) =>
    fetch(`${API_BASE}/chat/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then(r => r.json()),

  list: () => fetch(`${API_BASE}/chat/list`).then(r => r.json())
};

export const skillApi = {
  list: () => fetch(`${API_BASE}/skill/list`).then(r => r.json()),
  save: (skill: any) =>
    fetch(`${API_BASE}/skill/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill)
    }).then(r => r.json()),
  delete: (id: number) =>
    fetch(`${API_BASE}/skill/${id}`, { method: 'DELETE' }).then(r => r.json())
};

export const mcpApi = {
  list: () => fetch(`${API_BASE}/mcp/list`).then(r => r.json()),
  save: (server: any) =>
    fetch(`${API_BASE}/mcp/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(server)
    }).then(r => r.json()),
  test: (id: number) =>
    fetch(`${API_BASE}/mcp/test/${id}`, { method: 'POST' }).then(r => r.json())
};
