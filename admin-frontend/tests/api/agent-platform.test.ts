import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:8080';

// Global token - set once before all tests
let token = '';

beforeAll(async () => {
  // Login once and share token
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@fast.com',
      password: '123456'
    })
  });
  const data = await res.json();
  token = data.token;
}, 60000);

describe('Auth API', () => {
  it('GET /api/auth/me - get current user info', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.namespaces).toBeDefined();
  });
});

describe('Agent API (User)', () => {
  it('GET /api/agents?namespaceId=0 - list agents', async () => {
    const res = await fetch(`${BASE_URL}/api/agents?namespaceId=0`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/agents/1 - get single agent', async () => {
    const res = await fetch(`${BASE_URL}/api/agents/1`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(1);
    expect(data.name).toBeDefined();
  });

  it('GET /api/agents/1/resources?type=MODEL - get agent resources', async () => {
    const res = await fetch(`${BASE_URL}/api/agents/1/resources?type=MODEL`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('Admin API', () => {
  it('GET /api/admin/namespaces - list namespaces', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/namespaces`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/admin/agents?namespaceId=0 - list admin agents', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/agents?namespaceId=0`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/admin/agents/1 - get single admin agent', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/agents/1`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(1);
    expect(data.namespaceId).toBe(0);
  });

  it('POST /api/admin/agents - create new agent', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/agents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Namespace-Id': '1'
      },
      body: JSON.stringify({
        namespaceId: 1,
        name: 'Vitest助手',
        description: 'Vitest测试创建',
        systemPrompt: '你是测试助手'
      })
    });

    expect(res.status).toBeLessThanOrEqual(201);
  });

  it('POST /api/admin/users - create new user', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'vitest@test.com',
        nickname: 'VitestUser',
        password: '123456'
      })
    });

    expect(res.status).toBeLessThanOrEqual(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  it('GET /api/admin/models?namespaceId=0 - list models', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/models?namespaceId=0`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});