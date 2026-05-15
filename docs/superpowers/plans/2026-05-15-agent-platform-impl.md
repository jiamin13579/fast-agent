# Agent Platform 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建多租户 Agent 平台框架，支持 namespace 隔离、模型模板、Agent 和模型的多对多绑定

**Architecture:** 在现有 Spring Boot + Next.js 架构上扩展。后端新增 7 个 Entity/Mapper/Service/Controller，前端通过组件拼凑管理端功能，新增 namespace 切换器。通过 `user.is_admin` 区分全局管理，`user_namespace` 表实现 namespace 级权限。

**Tech Stack:** Spring Boot 3.2.5 / MyBatis-Plus / MySQL / Next.js 14 / shadcn/ui

---

## 文件结构

### 后端新增文件

```
backend/src/main/java/com/fast/agent/
├── entity/
│   ├── Namespace.java
│   ├── UserNamespace.java
│   ├── ModelTemplate.java
│   ├── LlmModel.java
│   ├── Agent.java
│   ├── AgentResource.java
│   └── UsageLog.java
├── repository/
│   ├── NamespaceMapper.java
│   ├── UserNamespaceMapper.java
│   ├── ModelTemplateMapper.java
│   ├── LlmModelMapper.java
│   ├── AgentMapper.java
│   ├── AgentResourceMapper.java
│   └── UsageLogMapper.java
├── service/
│   ├── NamespaceService.java
│   ├── ModelTemplateService.java
│   ├── LlmModelService.java
│   ├── AgentService.java
│   └── UsageLogService.java
├── rest/
│   ├── AdminNamespaceController.java
│   ├── AdminModelTemplateController.java
│   ├── AdminModelController.java
│   ├── AdminAgentController.java
│   └── UserAgentController.java
└── config/
    └── NamespaceContext.java
```

### 后端修改文件

```
backend/src/main/java/com/fast/agent/
├── entity/User.java              — role → isAdmin
├── entity/Role.java              — 删除（不再需要）
├── entity/Conversation.java      — 加 agentId, modelId, namespaceId
├── service/ConversationService.java  — 支持 agent_id + model_id
├── rest/ConversationController.java  — create 接受 agent_id, model_id
├── config/SecurityConfig.java        — 权限规则更新
├── init/DataInitializer.java         — 初始数据调整
└── runtime/LLMProviderFactory.java   — 从 llm_model 表读配置

backend/src/main/resources/
└── schema.sql                    — 完整 DB schema（DROP + CREATE）
```

### 前端新增文件

```
frontend/src/
├── components/admin/
│   ├── NamespaceList.tsx
│   ├── NamespaceForm.tsx
│   ├── ModelTemplateList.tsx
│   ├── ModelTemplateForm.tsx
│   ├── ModelList.tsx
│   ├── ModelForm.tsx
│   ├── AgentList.tsx
│   ├── AgentForm.tsx
│   ├── ResourceBindingDialog.tsx
│   └── AdminSidebar.tsx
├── components/NamespaceSwitcher.tsx
├── components/AgentSelect.tsx
├── components/ModelSelect.tsx
└── app/admin/
    ├── layout.tsx
    ├── namespaces/page.tsx
    ├── model-templates/page.tsx
    ├── models/page.tsx
    └── agents/page.tsx

### 前端修改文件

```
frontend/src/
├── app/(authenticated)/layout.tsx    — 加 NamespaceSwitcher
├── app/(authenticated)/page.tsx      — 选 Agent + Model
├── components/layout.tsx             — 加 namespace 上下文
├── lib/auth.ts                       — /auth/me 返回 namespaces
├── lib/config.ts                     — 加 admin API base
└── types/css.d.ts                    — 可选扩展
```

---

## 实施任务

### Task 1: 重建 schema.sql

**Files:**
- Modify: `backend/src/main/resources/schema.sql`
- Modify: `backend/src/main/resources/application.yml`

- [ ] **Step 1: 重写 schema.sql — DROP + CREATE 完整结构**

```sql
CREATE DATABASE IF NOT EXISTS agent_db DEFAULT CHARACTER SET utf8mb4;
USE agent_db;

DROP TABLE IF EXISTS agent_resource;
DROP TABLE IF EXISTS usage_log;
DROP TABLE IF EXISTS llm_model;
DROP TABLE IF EXISTS agent;
DROP TABLE IF EXISTS model_template;
DROP TABLE IF EXISTS user_namespace;
DROP TABLE IF EXISTS namespace;
DROP TABLE IF EXISTS chat_message;
DROP TABLE IF EXISTS conversation;
DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    nickname VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    status INT NOT NULL DEFAULT 1,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE conversation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL DEFAULT 1,
    uuid VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    agent_id BIGINT,
    model_id BIGINT,
    namespace_id BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_uuid (uuid),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE chat_message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    conversation_uuid VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL COMMENT 'user/assistant/system',
    content TEXT NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_uuid (uuid),
    INDEX idx_chat_message_conversation_uuid (conversation_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE namespace (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    status INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_namespace (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    namespace_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL COMMENT 'ADMIN/USER',
    UNIQUE KEY uk_user_namespace (user_id, namespace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE model_template (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    base_url VARCHAR(500),
    max_tokens INT,
    temperature DECIMAL(3,2),
    description VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE llm_model (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    namespace_id BIGINT NOT NULL COMMENT '0=全局模型',
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(500),
    base_url VARCHAR(500),
    max_tokens INT,
    temperature DECIMAL(3,2),
    status INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_namespace_model (namespace_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    namespace_id BIGINT NOT NULL COMMENT '0=全局 Agent',
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    system_prompt TEXT,
    avatar VARCHAR(500),
    status INT NOT NULL DEFAULT 1,
    version INT NOT NULL DEFAULT 1,
    created_by BIGINT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_namespace_agent (namespace_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_resource (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id BIGINT NOT NULL,
    resource_type VARCHAR(20) NOT NULL COMMENT 'MODEL/TOOL/SKILL/MCP',
    resource_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_agent_resource (agent_id, resource_type, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE usage_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    namespace_id BIGINT NOT NULL,
    agent_id BIGINT,
    model_id BIGINT,
    conversation_id VARCHAR(36),
    input_tokens INT,
    output_tokens INT,
    duration_ms INT,
    cost DECIMAL(10,6),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `user` (email, phone, nickname, password, is_admin, status, must_change_password) VALUES
('admin@fast.com', '13800000000', 'Admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE, 1, FALSE);

INSERT INTO namespace (code, name, description) VALUES ('default', '默认空间', '系统默认空间');
```

- [ ] **Step 2: 更新 application.yml**

禁用 Flyway，启用 schema.sql 初始化：

```yaml
spring:
  flyway:
    enabled: false
  sql:
    init:
      mode: always
  datasource:
    # ... 保持现有配置不变
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/schema.sql backend/src/main/resources/application.yml
git commit -m "feat: rebuild schema with agent platform tables"
```

---

### Task 2: 更新 User 和 Conversation Entity

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/entity/User.java`
- Modify: `backend/src/main/java/com/fast/agent/entity/Role.java`
- Modify: `backend/src/main/java/com/fast/agent/entity/Conversation.java`

- [ ] **Step 1: 修改 User.java — role 替换为 isAdmin**

```java
// 删除: private Role role;
// 新增:
private Boolean isAdmin;
// getter/setter 对应改为 getIsAdmin/setIsAdmin
```

- [ ] **Step 2: 删除 Role.java**

- [ ] **Step 3: Conversation.java 加 3 个字段**

```java
@TableField("agent_id")
private Long agentId;

@TableField("model_id")
private Long modelId;

@TableField("namespace_id")
private Long namespaceId;
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: update User and Conversation entities for agent platform"
```

---

### Task 3: 新增 7 个 Entity

**Files:**
- Create: `backend/src/main/java/com/fast/agent/entity/Namespace.java`
- Create: `backend/src/main/java/com/fast/agent/entity/UserNamespace.java`
- Create: `backend/src/main/java/com/fast/agent/entity/ModelTemplate.java`
- Create: `backend/src/main/java/com/fast/agent/entity/LlmModel.java`
- Create: `backend/src/main/java/com/fast/agent/entity/Agent.java`
- Create: `backend/src/main/java/com/fast/agent/entity/AgentResource.java`
- Create: `backend/src/main/java/com/fast/agent/entity/UsageLog.java`

- [ ] **Step 1: 创建 Namespace.java**

```java
package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("namespace")
public class Namespace {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String code;
    private String name;
    private String description;
    private Integer status;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 2: 创建 UserNamespace.java**

```java
package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("user_namespace")
public class UserNamespace {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("user_id")
    private Long userId;
    @TableField("namespace_id")
    private Long namespaceId;
    private String role;
}
```

- [ ] **Step 3: 创建 ModelTemplate.java**

```java
package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("model_template")
public class ModelTemplate {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String provider;
    @TableField("model_name")
    private String modelName;
    @TableField("base_url")
    private String baseUrl;
    @TableField("max_tokens")
    private Integer maxTokens;
    private BigDecimal temperature;
    private String description;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 4: 创建 LlmModel.java**

```java
package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("llm_model")
public class LlmModel {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("namespace_id")
    private Long namespaceId;
    private String name;
    private String provider;
    @TableField("model_name")
    private String modelName;
    @TableField("api_key")
    private String apiKey;
    @TableField("base_url")
    private String baseUrl;
    @TableField("max_tokens")
    private Integer maxTokens;
    private BigDecimal temperature;
    private Integer status;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 5: 创建 Agent.java**

```java
package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("agent")
public class Agent {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("namespace_id")
    private Long namespaceId;
    private String name;
    private String description;
    @TableField("system_prompt")
    private String systemPrompt;
    private String avatar;
    private Integer status;
    private Integer version;
    @TableField("created_by")
    private Long createdBy;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 6: 创建 AgentResource.java**

```java
package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("agent_resource")
public class AgentResource {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("agent_id")
    private Long agentId;
    @TableField("resource_type")
    private String resourceType;
    @TableField("resource_id")
    private Long resourceId;
    @TableField("created_at")
    private LocalDateTime createdAt;
}
```

- [ ] **Step 7: 创建 UsageLog.java**

```java
package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("usage_log")
public class UsageLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("user_id")
    private Long userId;
    @TableField("namespace_id")
    private Long namespaceId;
    @TableField("agent_id")
    private Long agentId;
    @TableField("model_id")
    private Long modelId;
    @TableField("conversation_id")
    private String conversationId;
    @TableField("input_tokens")
    private Integer inputTokens;
    @TableField("output_tokens")
    private Integer outputTokens;
    @TableField("duration_ms")
    private Integer durationMs;
    private BigDecimal cost;
    @TableField("created_at")
    private LocalDateTime createdAt;
}
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/fast/agent/entity/
git commit -m "feat: add 7 new entities for agent platform"
```

---

### Task 4: 新增 7 个 Mapper

**Files:**
- Create: `backend/src/main/java/com/fast/agent/repository/NamespaceMapper.java`
- Create: 其余 6 个 Mapper (UserNamespaceMapper, ModelTemplateMapper, LlmModelMapper, AgentMapper, AgentResourceMapper, UsageLogMapper)

- [ ] **Step 1: 创建所有 Mapper**

```java
package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fast.agent.entity.Namespace;

public interface NamespaceMapper extends BaseMapper<Namespace> {}
```

其余 6 个 Mapper 相同模式，替换 Entity 泛型即可。

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/fast/agent/repository/AgentMapper.java ...
git commit -m "feat: add mapper interfaces for agent platform"
```

---

### Task 5: 新增 5 个 Service

**Files:**
- Create: `backend/src/main/java/com/fast/agent/service/NamespaceService.java`
- Create: `backend/src/main/java/com/fast/agent/service/ModelTemplateService.java`
- Create: `backend/src/main/java/com/fast/agent/service/LlmModelService.java`
- Create: `backend/src/main/java/com/fast/agent/service/AgentService.java`
- Create: `backend/src/main/java/com/fast/agent/service/UsageLogService.java`

每个 Service 提供基础的 CRUD 方法，注入对应的 Mapper。

- [ ] **Step 1: 创建 NamespaceService.java**

```java
package com.fast.agent.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fast.agent.entity.Namespace;
import com.fast.agent.repository.NamespaceMapper;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class NamespaceService {

    @Autowired
    private NamespaceMapper namespaceMapper;

    public List<Namespace> list() {
        return namespaceMapper.selectList(null);
    }

    public Namespace getById(Long id) {
        return namespaceMapper.selectById(id);
    }

    public void create(Namespace namespace) {
        namespaceMapper.insert(namespace);
    }

    public void update(Namespace namespace) {
        namespaceMapper.updateById(namespace);
    }

    public void delete(Long id) {
        namespaceMapper.deleteById(id);
    }
}
```

- [ ] **Step 2: 创建 LlmModelService.java**

```java
package com.fast.agent.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fast.agent.entity.LlmModel;
import com.fast.agent.repository.LlmModelMapper;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class LlmModelService {

    @Autowired
    private LlmModelMapper llmModelMapper;

    public List<LlmModel> listByNamespace(Long namespaceId) {
        LambdaQueryWrapper<LlmModel> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LlmModel::getNamespaceId, namespaceId)
               .or().eq(LlmModel::getNamespaceId, 0L);
        return llmModelMapper.selectList(wrapper);
    }

    public LlmModel getById(Long id) {
        return llmModelMapper.selectById(id);
    }

    public void create(LlmModel model) {
        llmModelMapper.insert(model);
    }

    public void update(LlmModel model) {
        llmModelMapper.updateById(model);
    }

    public void delete(Long id) {
        llmModelMapper.deleteById(id);
    }
}
```

- [ ] **Step 3: 创建 AgentService.java**

```java
package com.fast.agent.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fast.agent.entity.Agent;
import com.fast.agent.entity.AgentResource;
import com.fast.agent.repository.AgentMapper;
import com.fast.agent.repository.AgentResourceMapper;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AgentService {

    @Autowired
    private AgentMapper agentMapper;
    @Autowired
    private AgentResourceMapper agentResourceMapper;

    public List<Agent> listByNamespace(Long namespaceId) {
        LambdaQueryWrapper<Agent> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Agent::getNamespaceId, namespaceId)
               .or().eq(Agent::getNamespaceId, 0L);
        return agentMapper.selectList(wrapper);
    }

    public Agent getById(Long id) {
        return agentMapper.selectById(id);
    }

    @Transactional
    public void create(Agent agent) {
        agentMapper.insert(agent);
    }

    public void update(Agent agent) {
        agentMapper.updateById(agent);
    }

    public void delete(Long id) {
        agentMapper.deleteById(id);
    }

    public List<AgentResource> getResources(Long agentId) {
        LambdaQueryWrapper<AgentResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentResource::getAgentId, agentId);
        return agentResourceMapper.selectList(wrapper);
    }

    public void bindResource(AgentResource resource) {
        agentResourceMapper.insert(resource);
    }

    public void unbindResource(Long agentId, Long resourceId, String type) {
        LambdaQueryWrapper<AgentResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentResource::getAgentId, agentId)
               .eq(AgentResource::getResourceId, resourceId)
               .eq(AgentResource::getResourceType, type);
        agentResourceMapper.delete(wrapper);
    }
}
```

- [ ] **Step 4: 创建 ModelTemplateService.java 和 UsageLogService.java**

ModelTemplateService: 简单 CRUD
UsageLogService: 只提供 insert 和 list

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/fast/agent/service/
git commit -m "feat: add service layer for agent platform"
```

---

### Task 6: Auth 变更 — isAdmin + namespace 上下文

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/config/SecurityConfig.java`
- Modify: `backend/src/main/java/com/fast/agent/config/JwtAuthenticationFilter.java`
- Create: `backend/src/main/java/com/fast/agent/config/NamespaceContext.java`
- Modify: `backend/src/main/java/com/fast/agent/service/AuthService.java`
- Modify: `backend/src/main/java/com/fast/agent/rest/AuthController.java`
- Modify: `backend/src/main/java/com/fast/agent/util/JwtUtil.java`
- Modify: `backend/src/main/java/com/fast/agent/init/DataInitializer.java`

- [ ] **Step 1: 创建 NamespaceContext.java**

```java
package com.fast.agent.config;

public class NamespaceContext {
    private static final ThreadLocal<Long> currentNamespace = new ThreadLocal<>();
    private static final ThreadLocal<Long> currentUserId = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> isAdmin = new ThreadLocal<>();

    public static void set(Long namespaceId, Long userId, Boolean admin) {
        currentNamespace.set(namespaceId);
        currentUserId.set(userId);
        isAdmin.set(admin);
    }

    public static Long getNamespaceId() { return currentNamespace.get(); }
    public static Long getUserId() { return currentUserId.get(); }
    public static Boolean getIsAdmin() { Boolean v = isAdmin.get(); return v != null && v; }

    public static void clear() {
        currentNamespace.remove();
        currentUserId.remove();
        isAdmin.remove();
    }
}
```

- [ ] **Step 2: 更新 JwtAuthenticationFilter**

在 `doFilterInternal` 解析 JWT 后：
1. 解析 `isAdmin` 字段
2. 从请求头 `X-Namespace-Id` 读取当前 namespace_id（Namespace Admin 必须传，Global Admin 传 0）
3. 调用 `NamespaceContext.set(namespaceId, userId, isAdmin)`

在 filter 的 finally 块中调用 `NamespaceContext.clear()` 防止内存泄漏。

- [ ] **Step 3: 更新 AuthService**

- `AuthService.me(userId)` 返回用户信息和 namespaces 列表
- 登录后 JWT payload 增加 `isAdmin` 字段

- [ ] **Step 4: 更新 AuthController /auth/me**

返回格式：
```json
{
  "user": { "id": 1, "email": "...", "isAdmin": true },
  "namespaces": [{ "id": 1, "name": "默认空间", "role": "ADMIN" }]
}
```

- [ ] **Step 5: 更新 DataInitializer**

原 DataInitializer 创建 6 个用户（1 SUPER_ADMIN + 2 ADMIN + 3 USER），字段含 `role` 枚举。
改为 schema.sql 内置初始数据（1 个 Global Admin + default namespace），
DataInitializer 只创建额外的种子数据（如 namespace 示例模板数据），不再操作 user 表。

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add isAdmin auth, namespace context, and me endpoint"
```

---

### Task 7: Security 权限控制

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/config/SecurityConfig.java`

- [ ] **Step 1: 更新 SecurityConfig**

URL 权限规则（在 `SecurityFilterChain` 中配置）：
- `/api/auth/**` — permitAll
- `/socket.io/**`, `/error` — permitAll
- `/api/admin/namespaces/**` — 仅 `isAdmin=true`
- `/api/admin/model-templates/**` — 仅 `isAdmin=true`
- `/api/admin/models/**` — 需认证 + 控制器层校验 namespace 权限
- `/api/admin/agents/**` — 需认证 + 控制器层校验 namespace 权限
- `/api/agents/**` — 需认证
- 其余 — 需认证

注意：SecurityConfig 需要将 `JwtAuthenticationFilter` 在过滤器链中正确注册（`addFilterBefore`），
并确保 `/auth/me` 在 permitAll 中仍能获取当前用户（通过 filter 解析 token）。

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: update security config for role-based access"
```

---

### Task 8: 管理端 Controller

**Files:**
- Create: `backend/src/main/java/com/fast/agent/rest/AdminNamespaceController.java`
- Create: `backend/src/main/java/com/fast/agent/rest/AdminModelTemplateController.java`
- Create: `backend/src/main/java/com/fast/agent/rest/AdminModelController.java`
- Create: `backend/src/main/java/com/fast/agent/rest/AdminAgentController.java`

- [ ] **Step 1: AdminNamespaceController.java**

```java
package com.fast.agent.rest;

import com.fast.agent.config.NamespaceContext;
import com.fast.agent.entity.Namespace;
import com.fast.agent.service.NamespaceService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/admin/namespaces")
public class AdminNamespaceController {

    @Autowired
    private NamespaceService namespaceService;

    @GetMapping
    public List<Namespace> list() {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return namespaceService.list();
    }

    @GetMapping("/{id}")
    public Namespace get(@PathVariable Long id) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return namespaceService.getById(id);
    }

    @PostMapping
    public void create(@RequestBody Namespace namespace) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespaceService.create(namespace);
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody Namespace namespace) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespace.setId(id);
        namespaceService.update(namespace);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespaceService.delete(id);
    }
}
```

- [ ] **Step 2: AdminModelController.java**

权限规则：Global Admin 可以操作 ns=0 的模型，Namespace Admin 只能操作自己 namespace 的模型。

```java
@RestController
@RequestMapping("/api/admin/models")
public class AdminModelController {

    @Autowired private LlmModelService llmModelService;
    @Autowired private UserNamespaceMapper userNamespaceMapper;

    private void checkPermission(Long namespaceId) {
        if (NamespaceContext.getIsAdmin()) return;
        if (namespaceId == 0L) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Long userId = NamespaceContext.getUserId();
        LambdaQueryWrapper<UserNamespace> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserNamespace::getUserId, userId)
               .eq(UserNamespace::getNamespaceId, namespaceId)
               .eq(UserNamespace::getRole, "ADMIN");
        if (userNamespaceMapper.selectCount(wrapper) == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }
}
```

- [ ] **Step 3: 创建其余 Controller（AdminModelTemplateController, AdminAgentController）**

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/fast/agent/rest/Admin*
git commit -m "feat: add admin controllers for agent platform"
```

---

### Task 9: 用户端 Controller + Conversation 更新

**Files:**
- Create: `backend/src/main/java/com/fast/agent/rest/UserAgentController.java`
- Modify: `backend/src/main/java/com/fast/agent/rest/ConversationController.java`
- Modify: `backend/src/main/java/com/fast/agent/service/ConversationService.java`
- Modify: `backend/src/main/java/com/fast/agent/runtime/LLMProviderFactory.java`

- [ ] **Step 1: 创建 UserAgentController.java**

```java
@RestController
@RequestMapping("/api/agents")
public class UserAgentController {

    @Autowired private AgentService agentService;

    @GetMapping
    public List<Agent> list(@RequestParam Long namespaceId) {
        return agentService.listByNamespace(namespaceId);
    }

    @GetMapping("/{id}")
    public Agent get(@PathVariable Long id) {
        return agentService.getById(id);
    }

    @GetMapping("/{id}/resources")
    public List<AgentResource> getResources(
            @PathVariable Long id,
            @RequestParam(required = false) String type) {
        List<AgentResource> all = agentService.getResources(id);
        if (type != null) {
            return all.stream()
                .filter(r -> r.getResourceType().equals(type))
                .collect(java.util.stream.Collectors.toList());
        }
        return all;
    }
}
```

- [ ] **Step 2: 更新 ConversationController.createConversation**

接受 `agent_id`, `model_id`, `namespace_id` 参数：

```java
@PostMapping
public Map<String, Object> createConversation(@RequestBody Map<String, Object> request) {
    String name = (String) request.getOrDefault("name", "新会话");
    Long agentId = request.get("agent_id") != null ? ((Number) request.get("agent_id")).longValue() : null;
    Long modelId = request.get("model_id") != null ? ((Number) request.get("model_id")).longValue() : null;
    Long namespaceId = request.get("namespace_id") != null ? ((Number) request.get("namespace_id")).longValue() : 0L;
    return conversationService.createConversation(name, agentId, modelId, namespaceId);
}
```

- [ ] **Step 3: 更新 ConversationService.createConversation**

在创建 Conversation 时传入 agentId, modelId, namespaceId。

```java
public Map<String, Object> createConversation(String name, Long agentId, Long modelId, Long namespaceId) {
    Conversation conv = new Conversation();
    conv.setUuid(java.util.UUID.randomUUID().toString());
    conv.setName(name);
    conv.setUserId(NamespaceContext.getUserId());
    conv.setAgentId(agentId);
    conv.setModelId(modelId);
    conv.setNamespaceId(namespaceId);
    conversationMapper.insert(conv);
    return Map.of("uuid", conv.getUuid(), "name", conv.getName(),
                  "agent_id", agentId, "model_id", modelId);
}
```

- [ ] **Step 4: 更新 LLMProviderFactory**

目前 `ConversationService` 直接调用 `providerFactory.getDefaultProvider().chatStream()`。
改为根据 conversation 绑定的 model_id 查 llm_model 配置，动态获取 provider 和 model_name：

```java
// ConversationService.send() 中
Conversation conv = conversationMapper.selectOne(...);
LlmModel modelConfig = llmModelService.getById(conv.getModelId());
LLMProvider provider = providerFactory.getProvider(modelConfig.getProvider());
// 使用 modelConfig.getModelName() 作为模型名
```

修改 LLMProviderFactory.getProvider(name) 方法，从数据库驱动改为根据传入的 provider name 查找对应 LLMProvider bean（Spring 容器 Map 注入方式已支持）。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add user agent API and update conversation flow"
```

---

### Task 10: 前端 — 核心组件（NamespaceSwitcher + AgentSelect + ModelSelect）

**Files:**
- Create: `frontend/src/components/NamespaceSwitcher.tsx`
- Create: `frontend/src/components/AgentSelect.tsx`
- Create: `frontend/src/components/ModelSelect.tsx`
- Modify: `frontend/src/components/layout.tsx`
- Modify: `frontend/src/app/(authenticated)/layout.tsx`
- Modify: `frontend/src/lib/auth.ts`

- [ ] **Step 1: 更新 auth.ts — /auth/me 返回 namespaces**

```typescript
export async function getCurrentUser(): Promise<{ user: any; namespaces: any[] }> {
  const token = getToken();
  if (!token) throw new Error("No token");
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
```

- [ ] **Step 2: 创建 NamespaceSwitcher.tsx**

```tsx
"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Namespace { id: number; name: string; role: string; }

export function NamespaceSwitcher({
  namespaces, current, onChange,
}: {
  namespaces: Namespace[]; current: number; onChange: (id: number) => void;
}) {
  return (
    <Select value={String(current)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {namespaces.map((ns) => (
          <SelectItem key={ns.id} value={String(ns.id)}>{ns.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 3: 创建 AgentSelect.tsx**

```tsx
"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Agent { id: number; name: string; }

export function AgentSelect({
  agents, value, onChange, placeholder = "选择 Agent",
}: {
  agents: Agent[]; value: number | null; onChange: (id: number) => void; placeholder?: string;
}) {
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {agents.map((a) => (
          <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: 创建 ModelSelect.tsx** — 同上模式

```tsx
interface ModelItem { id: number; name: string; }
export function ModelSelect({ models, value, onChange }: { ... }) {
  // 同 AgentSelect
}
```

- [ ] **Step 5: 更新 layout.tsx 的 AppContext**

增加 `currentNamespaceId`、`namespaces` 状态（app 级），登录后通过 `/auth/me` 获取。
`selectedAgentId`、`selectedModelId` 等页面级状态由 page.tsx 自行管理，不放在 AppContext。

- [ ] **Step 6: 更新 (authenticated)/layout.tsx**

Header 区域加入 NamespaceSwitcher 组件。

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/NamespaceSwitcher.tsx frontend/src/components/AgentSelect.tsx frontend/src/components/ModelSelect.tsx frontend/src/components/layout.tsx frontend/src/lib/auth.ts
git commit -m "feat: add core frontend components for agent platform"
```

---

### Task 11: 前端 — 管理端组件 + 页面

**Files:**
- Create: `frontend/src/components/admin/AdminSidebar.tsx`
- Create: `frontend/src/components/admin/NamespaceList.tsx`
- Create: `frontend/src/components/admin/NamespaceForm.tsx`
- Create: `frontend/src/components/admin/ModelTemplateList.tsx`
- Create: `frontend/src/components/admin/ModelTemplateForm.tsx`
- Create: `frontend/src/components/admin/ModelList.tsx`
- Create: `frontend/src/components/admin/ModelForm.tsx`
- Create: `frontend/src/components/admin/AgentList.tsx`
- Create: `frontend/src/components/admin/AgentForm.tsx`
- Create: `frontend/src/components/admin/ResourceBindingDialog.tsx`
- Create: `frontend/src/app/admin/layout.tsx`
- Create: `frontend/src/app/admin/namespaces/page.tsx`
- Create: `frontend/src/app/admin/model-templates/page.tsx`
- Create: `frontend/src/app/admin/models/page.tsx`
- Create: `frontend/src/app/admin/agents/page.tsx`

- [ ] **Step 1: AdminSidebar.tsx** — 管理侧边栏

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/namespaces", label: "Namespaces" },
  { href: "/admin/model-templates", label: "模型模板" },
  { href: "/admin/models", label: "模型管理" },
  { href: "/admin/agents", label: "Agent 管理" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 border-r p-4 space-y-2">
      {links.map((link) => (
        <Link key={link.href} href={link.href}
          className={`block px-3 py-2 rounded ${pathname === link.href ? "bg-accent" : "hover:bg-accent/50"}`}>
          {link.label}
        </Link>
      ))}
    </aside>
  );
}
```

- [ ] **Step 2: admin/layout.tsx** — 布局页

```tsx
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: 页面组件** — 每个列表组件 + 表单组件

每个管理功能由一对组件构成：`XxxList`（表格 + 操作按钮）+ `XxxForm`（弹窗表单）。

**NamespaceList.tsx** — 使用 shadcn/ui Table + Dialog，调用 `/api/admin/namespaces`
**NamespaceForm.tsx** — 表单字段: code, name, description

**ModelTemplateList.tsx** — 列表 + 创建/编辑/删除
**ModelTemplateForm.tsx** — 表单: name, provider, model_name, base_url, max_tokens, temperature

**ModelList.tsx** — 按 namespace 过滤显示，创建时可从模板预填
**ModelForm.tsx** — 表单: namespace_id, name, provider, model_name, api_key, base_url, max_tokens, temperature

**AgentList.tsx** — 列表 + 创建/编辑/删除 + "绑定资源"按钮
**AgentForm.tsx** — 表单: namespace_id, name, description, system_prompt
**ResourceBindingDialog.tsx** — 弹窗选择资源类型 + 资源列表，调用 `/api/admin/agents/{id}/resources`

- [ ] **Step 4: 管理页面** — 每个 page.tsx 只负责渲染对应 List 组件

```tsx
// app/admin/namespaces/page.tsx
import { NamespaceList } from "@/components/admin/NamespaceList";

export default function NamespacesPage() {
  return <NamespaceList />;
}
```

其余 3 个页面同理。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/ frontend/src/app/admin/
git commit -m "feat: add admin components and pages for agent platform"
```

---

### Task 12: 前端 — 用户端会话创建选 Agent + Model

**Files:**
- Modify: `frontend/src/app/(authenticated)/page.tsx`
- Modify: `frontend/src/components/layout.tsx`

- [ ] **Step 1: 更新 AppContext**

保证 `currentNamespaceId` 变化时，重新加载 Agent 列表并重置选择。

- [ ] **Step 2: 更新 page.tsx**

在创建会话的流程中插入两步选择：

```tsx
"use client";
import { useAppContext } from "@/components/layout";
import { AgentSelect } from "@/components/AgentSelect";
import { ModelSelect } from "@/components/ModelSelect";
import { useEffect, useState } from "react";

export default function ConversationView() {
  const { currentNamespaceId } = useAppContext();
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);

  // namespace 变化时加载 Agent 列表
  useEffect(() => {
    if (!currentNamespaceId) return;
    fetch(`/api/agents?namespaceId=${currentNamespaceId}`)
      .then(r => r.json()).then(setAgents);
  }, [currentNamespaceId]);

  // 选择 Agent 后加载绑定的模型
  useEffect(() => {
    if (!selectedAgentId) return;
    fetch(`/api/agents/${selectedAgentId}/resources?type=MODEL`)
      .then(r => r.json()).then(setModels);
  }, [selectedAgentId]);

  return (
    <div>
      <AgentSelect agents={agents} value={selectedAgentId} onChange={setSelectedAgentId} />
      {selectedAgentId && (
        <ModelSelect models={models} value={selectedModelId} onChange={setSelectedModelId} />
      )}
      {/* 现有聊天界面，创建会话时带 agent_id + model_id */}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add agent/model selection in conversation creation"
```

---

## 验收检查

- [ ] `mvn compile` 通过
- [ ] `schema.sql DROP + CREATE 执行成功，所有表创建正确`
- [ ] `/api/auth/me` 返回 `{ user, namespaces }`
- [ ] Global Admin 可以 CRUD namespace
- [ ] Global Admin 可以创建 ns=0 的 Agent 和 Model
- [ ] Namespace Admin 可以在自己 namespace 下 CRUD Agent/Model
- [ ] Namespace Admin 不能操作其他 namespace 的资源
- [ ] 用户端选 Agent → 展示绑定的 Model → 创建会话 → 发送消息
- [ ] 前端 namespace 切换 → API 请求携带正确 namespace_id
