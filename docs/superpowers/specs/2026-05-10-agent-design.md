# Agent 个人助手 - 系统设计

## 一、技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18 + Ant Design 5 + Vite |
| **后端** | Java Spring Boot 3 + Spring AI |
| **ORM** | MyBatis Plus |
| **数据库** | MySQL 8 |
| **任务调度** | 数据库轮询 + Spring @Scheduled |
| **大模型** | MiniMax + Codex（统一 GPT 兼容协议） |
| **MCP** | Python MCP Server ↔ Java HTTP 通信 |
| **RAG** | 本地文件读取 + Web 搜索（可扩展） |

---

## 二、系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        前端 (React + AntD)                        │
│                                                                  │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│   │  聊天窗口   │  │  Skill管理  │  │  MCP管理   │               │
│   └────────────┘  └────────────┘  └────────────┘               │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│   │  定时任务   │  │  知识库管理 │  │  会话管理   │               │
│   └────────────┘  └────────────┘  └────────────┘               │
└──────────────────────────────┬───────────────────────────────────┘
                               │ WebSocket + REST
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Java Spring Boot Agent                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │ Chat       │  │ Command    │  │ Script     │                 │
│  │ Handler    │  │ Registry   │  │ Interpreter│                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    LLM Agent (自主循环)                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │ │
│  │  │ @Tool    │  │ @Skill   │  │ RAG      │  │ Memory     │  │ │
│  │  │ Registry │  │ Registry │  │ (文件/Web)│  │ System     │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              动态配置层 (DB 驱动)                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │ Skill    │  │ MCP      │  │ Scheduled│  │ Knowledge│  │ │
│  │  │ Registry │  │ Registry │  │ Tasks    │  │ Sources  │  │ │
│  │  │ (DB)     │  │ (DB)     │  │ (DB)     │  │ (DB)     │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
      ┌─────────────┐                    ┌─────────────┐
      │ MySQL 8     │                    │ MCP Python  │
      │             │                    │ Server      │
      │ - agent_chat│                    │ (远程执行)  │
      │ - agent_skill│                    └─────────────┘
      │ - agent_task│
      │ - agent_mcp │
      │ - agent_knowledge │
      └─────────────┘
```

---

## 三、动态配置系统

所有配置通过 DB 存储，前端 UI 管理，运行时生效。

### 3.1 Skill 动态注册

```sql
agent_skill
├── id
├── name           -- 唯一标识 "refresh-data"
├── description    -- 描述 "重新拉取数据源"
├── tools          -- JSON: [{"method":"refresh", "desc":"执行刷新"}]
├── config         -- JSON: 自定义配置
└── enabled        -- true/false
```

**前端操作：**
- 新增 Skill → 填写表单 → 存入 DB → LLM 立即可用
- 编辑/禁用 → 实时生效

### 3.2 MCP Server 动态配置

```sql
agent_mcp_server
├── id
├── name           -- "生产服务器"
├── url            -- "http://192.168.1.100:9000"
├── auth_type      -- "none" / "bearer" / "api_key"
├── auth_token     -- 加密存储
├── enabled        -- true/false
└── last_test      -- 最后连接测试时间
```

**前端操作：**
- 添加 MCP Server → 填写地址/认证 → 测试连接 → 保存
- 多个远程服务器切换

### 3.3 定时任务动态配置

```sql
agent_scheduled_task
├── id
├── name           -- "每日数据同步"
├── cron           -- "0 0 3 * * ?"  (每天凌晨3点)
├── skill_id       -- 关联的 Skill
├── params         -- JSON: 执行参数
├── enabled        -- true/false
└── last_run       -- 上次执行时间
```

**前端操作：**
- 创建 Cron 任务 → 选择 Skill → 设置参数 → 定时触发

### 3.4 RAG 知识源动态配置

```sql
agent_knowledge_source
├── id
├── name           -- "运维手册"
├── type           -- "local" / "web"
├── path           -- 本地路径: "/data/knowledge/docs"
├── url            -- 网页地址: "https://example.com/docs"
├── enabled        -- true/false
└── sync_interval  -- 同步间隔（Web 类型）
```

**前端操作：**
- 添加本地目录或网页 → 自动索引 → RAG 检索

---

## 四、核心模块

### 4.1 Chat Handler
- 处理 WebSocket/REST 请求
- 命令解析（斜杠命令、自然语言、脚本）
- 会话路由

### 4.2 Command Registry
- 注册可用命令（从 DB 加载）
- 结构化解析 `/restart service-a --force`
- 命令补全、别名支持

### 4.3 Script Interpreter
- 支持变量、循环、条件
- 批处理操作

### 4.4 LLM Agent
- 自主 Tool 循环调用
- 意图识别 + 任务分解
- Spring AI 集成
- MiniMax / Codex 双协议支持

### 4.5 Tool Registry
- `@Tool` 注解暴露原子操作
- 从 DB Skill 动态发现 Tool
- MCP 转发、命令执行

### 4.6 Skill Registry
- 从 DB 加载 Skill 配置
- 动态注册到 LLM
- 按需启用/禁用

### 4.7 Memory System
| 层级 | 存储 | 说明 |
|------|------|------|
| Working Memory | 本地内存 | LLM 上下文窗口，控制 token |
| Session Memory | MySQL | 多会话持久化，支持恢复 |
| Knowledge Base | 本地文件 + Web | RAG 检索增强 |

### 4.8 RAG System
- 本地文件监听（knowledge/ 目录）
- Web 搜索（可扩展）
- 检索相关片段注入 LLM 上下文

### 4.9 Task Scheduler
- DB 轮询 + @Scheduled
- 状态机：PENDING → RUNNING → COMPLETED/FAILED
- 失败重试

---

## 五、命令解析

```
用户输入
  │
  ├─ /命令 → Command Registry 解析
  │    例: /restart service-a --force
  │
  ├─ 自然语言 → LLM Agent 处理
  │    例: "帮我重启服务A"
  │
  └─ 脚本模式 → Script Interpreter
       例: for s in [a,b,c] { /restart $s }
```

---

## 六、数据库表设计

```sql
agent_chat              -- 会话表
agent_message           -- 消息表

agent_skill             -- Skill 动态配置
├── name
├── description
├── tools (JSON)
├── config (JSON)
└── enabled

agent_mcp_server        -- MCP Server 动态配置
├── name
├── url
├── auth_type
├── auth_token
└── enabled

agent_scheduled_task     -- 定时任务配置
├── name
├── cron
├── skill_id
├── params (JSON)
└── enabled

agent_knowledge_source   -- RAG 知识源配置
├── name
├── type (local/web)
├── path/url
└── enabled

agent_task              -- 任务执行记录
agent_log               -- 执行日志
agent_config            -- 系统配置
```

---

## 七、目录结构

```
agent-system/
├── frontend/                 # React 前端
│   └── src/
│       ├── pages/
│       │   ├── Chat.tsx      # 聊天窗口
│       │   ├── SkillManage.tsx
│       │   ├── McpManage.tsx
│       │   ├── TaskManage.tsx
│       │   └── KnowledgeManage.tsx
│       └── services/
│
├── backend/                 # Java Spring Boot
│   └── src/main/java/com/agent/
│       ├── core/
│       │   ├── chat/        # 聊天处理
│       │   ├── command/     # 命令解析
│       │   ├── agent/        # LLM Agent
│       │   ├── tool/          # Tool 注册
│       │   ├── skill/         # Skill 管理
│       │   ├── memory/        # 记忆系统
│       │   ├── rag/           # RAG
│       │   └── task/          # 任务调度
│       ├── dynamic/          # 动态配置
│       │   ├── skill/         # Skill DB 驱动
│       │   ├── mcp/           # MCP Server DB 驱动
│       │   ├── scheduled/     # 定时任务 DB 驱动
│       │   └── knowledge/      # 知识源 DB 驱动
│       └── adapter/           # LLM 适配器
│
├── knowledge/               # RAG 本地知识库
│   ├── docs/
│   └── manual/
│
└── mcp-server/              # Python MCP Server
    └── server.py
```

---

## 八、分阶段实现

### Phase 1: 核心框架
- Spring Boot 项目搭建
- MySQL 表设计
- 聊天接口（WebSocket）
- LLM 对接（Tool 调用循环）

### Phase 2: 动态配置
- Skill 动态注册（DB + UI）
- MCP Server 动态配置
- 基础管理界面

### Phase 3: 命令与记忆
- 斜杠命令解析
- 自然语言理解
- Session 持久化
- 多会话管理

### Phase 4: 定时任务
- Cron 调度
- 任务执行
- 失败重试

### Phase 5: RAG
- 本地文件监听
- 文本检索
- 上下文注入
- Web 搜索（可扩展）

---

## 九、配置示例

```yaml
# application.yml
agent:
  mcp:
    default-server: http://localhost:9000
  llm:
    provider: minimax  # 或 codex
    api-key: ${LLM_API_KEY}
  knowledge:
    path: ./knowledge
```