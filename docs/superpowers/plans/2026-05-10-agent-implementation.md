# Agent 个人助手 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个完整的 Agent 个人助手系统，支持聊天交互、Skill 动态扩展、MCP 远程执行、RAG 知识增强

**Architecture:** Spring Boot 单体应用 + React 前端，通过 WebSocket 通信，LLM 自主 Tool 循环调用，DB 驱动动态配置

**Tech Stack:** Spring Boot 3 + Spring AI, MyBatis Plus, MySQL 8, React + Ant Design, Python MCP Server

---

## 数据库配置

```yaml
MySQL: 43.134.96.44:3306
User: dbadmin
Pass: Db@Adm123
Database: agent_db
```

---

## 文件结构

```
agent-system/
├── backend/                           # Java Spring Boot
│   └── src/main/java/com/agent/
│       ├── AgentApplication.java
│       ├── core/
│       │   ├── chat/ChatHandler.java
│       │   ├── command/CommandRegistry.java
│       │   ├── agent/LlmAgent.java
│       │   ├── tool/ToolRegistry.java
│       │   ├── skill/SkillRegistry.java
│       │   ├── memory/MemoryService.java
│       │   ├── rag/RagService.java
│       │   └── task/TaskScheduler.java
│       ├── dynamic/
│       │   ├── entity/Skill.java, McpServer.java, ScheduledTask.java, KnowledgeSource.java
│       │   ├── mapper/
│       │   └── service/
│       ├── adapter/
│       │   └── LlmAdapter.java
│       └── mcp/
│           └── McpGateway.java
│
├── frontend/                          # React
│   └── src/
│       ├── pages/Chat.tsx, SkillManage.tsx, McpManage.tsx, TaskManage.tsx, KnowledgeManage.tsx
│       └── services/
│
└── mcp-server/                       # Python MCP
    └── server.py
```

---

## Phase 1: 核心框架

### Task 1: 项目初始化

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/com/agent/AgentApplication.java`
- Create: `backend/src/main/resources/application.yml`
- Create: `frontend/package.json`

- [ ] **Step 1: 创建 backend/pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>

    <groupId>com.agent</groupId>
    <artifactId>agent-system</artifactId>
    <version>0.1.0</version>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-websocket</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-mybatis-plus</artifactId>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>
    </dependencies>
</project>
```

- [ ] **Step 2: 创建 AgentApplication.java**

```java
package com.agent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AgentApplication {
    public static void main(String[] args) {
        SpringApplication.run(AgentApplication.class, args);
    }
}
```

- [ ] **Step 3: 创建 application.yml**

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://43.134.96.44:3306/agent_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: dbadmin
    password: Db@Adm123
    driver-class-name: com.mysql.cj.jdbc.Driver

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true
  global-config:
    db-config:
      id-type: auto

agent:
  llm:
    provider: minimax
    api-key: ${LLM_API_KEY:your-api-key}
    base-url: ${LLM_BASE_URL:https://api.minimax.chat}
  mcp:
    default-url: http://localhost:9000
  knowledge:
    path: ./knowledge
```

- [ ] **Step 4: 创建 frontend/package.json**

```json
{
  "name": "agent-frontend",
  "version": "0.1.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.12.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git init && git add -A && git commit -m "feat: project init"
```

---

### Task 2: 数据库表设计

**Files:**
- Create: `backend/src/main/resources/schema.sql`

- [ ] **Step 1: 创建 schema.sql**

```sql
CREATE DATABASE IF NOT EXISTS agent_db DEFAULT CHARACTER SET utf8mb4;

USE agent_db;

CREATE TABLE agent_chat (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL COMMENT 'user/assistant/system',
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES agent_chat(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_skill (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    tools JSON COMMENT '工具定义',
    config JSON COMMENT '配置参数',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_mcp_server (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    auth_type VARCHAR(20) DEFAULT 'none' COMMENT 'none/bearer/api_key',
    auth_token VARCHAR(500),
    enabled BOOLEAN DEFAULT TRUE,
    last_test TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_scheduled_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cron VARCHAR(50) NOT NULL,
    skill_id BIGINT,
    params JSON,
    enabled BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_knowledge_source (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL COMMENT 'local/web',
    path VARCHAR(500),
    url VARCHAR(500),
    enabled BOOLEAN DEFAULT TRUE,
    sync_interval INT DEFAULT 3600,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/RUNNING/COMPLETED/FAILED',
    skill_id BIGINT,
    params JSON,
    result TEXT,
    error_msg TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: 初始化数据库**

Run: `mysql -h 43.134.96.44 -u dbadmin -p'Db@Adm123' < backend/src/main/resources/schema.sql`

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/schema.sql && git commit -m "feat: add database schema"
```

---

### Task 3: 动态配置 Entity 和 Mapper

**Files:**
- Create: `backend/src/main/java/com/agent/dynamic/entity/Skill.java`
- Create: `backend/src/main/java/com/agent/dynamic/entity/McpServer.java`
- Create: `backend/src/main/java/com/agent/dynamic/entity/ScheduledTask.java`
- Create: `backend/src/main/java/com/agent/dynamic/entity/KnowledgeSource.java`
- Create: `backend/src/main/java/com/agent/dynamic/mapper/SkillMapper.java`
- Create: `backend/src/main/java/com/agent/dynamic/mapper/McpServerMapper.java`
- Create: `backend/src/main/java/com/agent/dynamic/mapper/ScheduledTaskMapper.java`
- Create: `backend/src/main/java/com/agent/dynamic/mapper/KnowledgeSourceMapper.java`

- [ ] **Step 1: 创建 Skill.java**

```java
package com.agent.dynamic.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("agent_skill")
public class Skill {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String description;
    private String tools;
    private String config;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 2: 创建 McpServer.java, ScheduledTask.java, KnowledgeSource.java**

（同理创建，结构类似）

- [ ] **Step 3: 创建各 Mapper 接口**

```java
package com.agent.dynamic.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.agent.dynamic.entity.Skill;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SkillMapper extends BaseMapper<Skill> {
}
```

- [ ] **Step 4: 创建其他 Mapper（同理）**

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add dynamic entity and mapper"
```

---

### Task 4: LLM 适配器

**Files:**
- Create: `backend/src/main/java/com/agent/adapter/LlmAdapter.java`
- Create: `backend/src/main/java/com/agent/adapter/LlmResponse.java`

- [ ] **Step 1: 创建 LlmResponse.java**

```java
package com.agent.adapter;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class LlmResponse {
    private String content;
    private List<Map<String, String>> toolCalls;
}
```

- [ ] **Step 2: 创建 LlmAdapter.java**

```java
package com.agent.adapter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import java.util.*;

@Component
public class LlmAdapter {

    @Value("${agent.llm.provider:minimax}")
    private String provider;

    @Value("${agent.llm.api-key}")
    private String apiKey;

    @Value("${agent.llm.base-url}")
    private String baseUrl;

    private final WebClient webClient = WebClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader("Authorization", "Bearer " + apiKey)
            .build();

    public LlmResponse chat(List<Map<String, String>> messages) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", provider);
        body.put("messages", messages);

        String response = webClient.post()
                .uri("/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        return parseResponse(response);
    }

    private LlmResponse parseResponse(String response) {
        // 解析 MiniMax/Codex 响应格式
        // 返回 content 和 tool_calls
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add LLM adapter"
```

---

### Task 5: MCP 网关

**Files:**
- Create: `backend/src/main/java/com/agent/mcp/McpGateway.java`
- Create: `backend/src/main/java/com/agent/mcp/McpRequest.java`
- Create: `backend/src/main/java/com/agent/mcp/McpResponse.java`

- [ ] **Step 1: 创建 McpRequest.java**

```java
package com.agent.mcp;

import lombok.Data;

@Data
public class McpRequest {
    private String tool;
    private Map<String, Object> params;
}
```

- [ ] **Step 2: 创建 McpResponse.java**

```java
package com.agent.mcp;

import lombok.Data;

@Data
public class McpResponse {
    private boolean success;
    private String result;
    private String error;
}
```

- [ ] **Step 3: 创建 McpGateway.java**

```java
package com.agent.mcp;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
public class McpGateway {

    @Value("${agent.mcp.default-url}")
    private String defaultUrl;

    private final WebClient webClient = WebClient.builder().build();

    public McpResponse execute(String tool, Map<String, Object> params) {
        try {
            String response = webClient.post()
                    .uri(defaultUrl + "/execute")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(new McpRequest(tool, params))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return parseResponse(response);
        } catch (Exception e) {
            return new McpResponse(false, null, e.getMessage());
        }
    }

    private McpResponse parseResponse(String response) {
        // 解析 MCP Server 响应
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add MCP gateway"
```

---

### Task 6: Tool 注册表

**Files:**
- Create: `backend/src/main/java/com/agent/core/tool/ToolRegistry.java`
- Create: `backend/src/main/java/com/agent/core/tool/ToolDefinition.java`
- Create: `backend/src/main/java/com/agent/core/tool/McpTool.java`

- [ ] **Step 1: 创建 ToolDefinition.java**

```java
package com.agent.core.tool;

import lombok.Data;

@Data
public class ToolDefinition {
    private String name;
    private String description;
    private Map<String, ParamDefinition> params;

    @Data
    public static class ParamDefinition {
        private String type;
        private String description;
        private boolean required;
    }
}
```

- [ ] **Step 2: 创建 McpTool.java**

```java
package com.agent.core.tool;

import com.agent.mcp.McpGateway;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.util.Map;

@Data
@Component
public class McpTool {
    @Autowired
    private McpGateway mcpGateway;

    @Tool(name = "execute_command", description = "执行远程服务器命令")
    public String executeCommand(
            @Param(name = "server", description = "服务器名称") String server,
            @Param(name = "command", description = "要执行的命令") String command) {
        return mcpGateway.execute("exec", Map.of("server", server, "cmd", command));
    }

    @Tool(name = "refresh_data", description = "重新拉取数据源")
    public String refreshData(
            @Param(name = "source", description = "数据源名称") String source) {
        return mcpGateway.execute("refresh", Map.of("source", source));
    }
}
```

- [ ] **Step 3: 创建 ToolRegistry.java**

```java
package com.agent.core.tool;

import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class ToolRegistry {
    private final Map<String, ToolDefinition> tools = new HashMap<>();

    public void register(ToolDefinition tool) {
        tools.put(tool.getName(), tool);
    }

    public List<ToolDefinition> getAllTools() {
        return new ArrayList<>(tools.values());
    }

    public ToolDefinition getTool(String name) {
        return tools.get(name);
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add tool registry"
```

---

### Task 7: Skill 注册表

**Files:**
- Create: `backend/src/main/java/com/agent/core/skill/SkillRegistry.java`
- Create: `backend/src/main/java/com/agent/core/skill/SkillService.java`

- [ ] **Step 1: 创建 SkillService.java**

```java
package com.agent.core.skill;

import com.agent.dynamic.entity.Skill;
import com.agent.dynamic.mapper.SkillMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class SkillService {

    @Autowired
    private SkillMapper skillMapper;

    public List<Skill> getEnabledSkills() {
        return skillMapper.selectList(
            new LambdaQueryWrapper<Skill>().eq(Skill::getEnabled, true)
        );
    }

    public Skill getSkillByName(String name) {
        return skillMapper.selectOne(
            new LambdaQueryWrapper<Skill>().eq(Skill::getName, name)
        );
    }

    public void save(Skill skill) {
        if (skill.getId() == null) {
            skillMapper.insert(skill);
        } else {
            skillMapper.updateById(skill);
        }
    }

    public void delete(Long id) {
        skillMapper.deleteById(id);
    }
}
```

- [ ] **Step 2: 创建 SkillRegistry.java**

```java
package com.agent.core.skill;

import com.agent.core.tool.ToolRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import javax.annotation.PostConstruct;
import java.util.*;

@Component
public class SkillRegistry {

    @Autowired
    private SkillService skillService;

    @Autowired
    private ToolRegistry toolRegistry;

    @PostConstruct
    public void init() {
        loadSkillsFromDB();
    }

    public void loadSkillsFromDB() {
        List<Skill> skills = skillService.getEnabledSkills();
        for (Skill skill : skills) {
            registerSkill(skill);
        }
    }

    private void registerSkill(Skill skill) {
        // 解析 tools JSON，注册到 ToolRegistry
    }

    public void reload() {
        toolRegistry.getAllTools().clear();
        loadSkillsFromDB();
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add skill registry"
```

---

### Task 8: LLM Agent (自主循环)

**Files:**
- Create: `backend/src/main/java/com/agent/core/agent/LlmAgent.java`

- [ ] **Step 1: 创建 LlmAgent.java**

```java
package com.agent.core.agent;

import com.agent.adapter.LlmAdapter;
import com.agent.adapter.LlmResponse;
import com.agent.core.tool.ToolRegistry;
import com.agent.core.tool.ToolDefinition;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class LlmAgent {

    @Autowired
    private LlmAdapter llmAdapter;

    @Autowired
    private ToolRegistry toolRegistry;

    private static final int MAX_LOOPS = 10;

    public String process(String userMessage, List<Map<String, String>> history) {
        List<Map<String, String>> messages = new ArrayList<>(history);
        messages.add(Map.of("role", "user", "content", userMessage));

        for (int i = 0; i < MAX_LOOPS; i++) {
            LlmResponse response = llmAdapter.chat(messages);

            if (response.getToolCalls() == null || response.getToolCalls().isEmpty()) {
                return response.getContent();
            }

            for (Map<String, String> toolCall : response.getToolCalls()) {
                String toolName = toolCall.get("name");
                String args = toolCall.get("arguments");
                String result = executeTool(toolName, args);
                messages.add(Map.of("role", "tool", "name", toolName, "content", result));
            }
        }

        return "已达到最大循环次数";
    }

    private String executeTool(String name, String args) {
        ToolDefinition tool = toolRegistry.getTool(name);
        if (tool == null) return "Tool not found: " + name;

        // 解析 args 并调用
        return "tool result";
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add LLM agent with tool loop"
```

---

### Task 9: 聊天处理器

**Files:**
- Create: `backend/src/main/java/com/agent/core/chat/ChatHandler.java`
- Create: `backend/src/main/java/com/agent/core/chat/WebSocketConfig.java`

- [ ] **Step 1: 创建 ChatHandler.java**

```java
package com.agent.core.chat;

import com.agent.core.agent.LlmAgent;
import com.agent.core.memory.MemoryService;
import com.agent.dynamic.entity.Chat;
import com.agent.dynamic.entity.Message;
import com.agent.dynamic.mapper.ChatMapper;
import com.agent.dynamic.mapper.MessageMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/chat")
public class ChatHandler {

    @Autowired
    private LlmAgent llmAgent;

    @Autowired
    private MemoryService memoryService;

    @Autowired
    private ChatMapper chatMapper;

    @Autowired
    private MessageMapper messageMapper;

    @PostMapping("/send")
    public Map<String, Object> send(@RequestBody Map<String, Object> request) {
        Long chatId = request.get("chat_id");
        String content = (String) request.get("content");

        Chat chat = chatMapper.selectById(chatId);
        List<Map<String, String>> history = memoryService.getHistory(chatId);

        String response = llmAgent.process(content, history);

        messageMapper.insert(new Message(chatId, "user", content));
        messageMapper.insert(new Message(chatId, "assistant", response));

        return Map.of("response", response);
    }

    @GetMapping("/history/{chatId}")
    public List<Message> getHistory(@PathVariable Long chatId) {
        return messageMapper.selectList(
            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Message>()
                .eq(Message::getChatId, chatId)
                .orderByAsc(Message::getCreatedAt)
        );
    }
}
```

- [ ] **Step 2: 创建 WebSocketConfig.java**

```java
package com.agent.core.chat;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new ChatWebSocketHandler(), "/ws/chat")
                .setAllowedOrigins("*");
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add chat handler and websocket"
```

---

### Task 10: 记忆系统

**Files:**
- Create: `backend/src/main/java/com/agent/core/memory/MemoryService.java`

- [ ] **Step 1: 创建 MemoryService.java**

```java
package com.agent.core.memory;

import com.agent.dynamic.entity.Message;
import com.agent.dynamic.mapper.MessageMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MemoryService {

    @Autowired
    private MessageMapper messageMapper;

    private static final int MAX_CONTEXT_TOKENS = 32000;

    public List<Map<String, String>> getHistory(Long chatId) {
        List<Message> messages = messageMapper.selectList(
            new LambdaQueryWrapper<Message>()
                .eq(Message::getChatId, chatId)
                .orderByAsc(Message::getCreatedAt)
        );

        return messages.stream()
            .map(m -> Map.of("role", m.getRole(), "content", m.getContent()))
            .collect(Collectors.toList());
    }

    public List<Map<String, String>> getContextWindow(Long chatId, int maxMessages) {
        List<Map<String, String>> history = getHistory(chatId);
        if (history.size() <= maxMessages) return history;
        return history.subList(history.size() - maxMessages, history.size());
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add memory service"
```

---

### Task 11: 任务调度器

**Files:**
- Create: `backend/src/main/java/com/agent/core/task/TaskScheduler.java`

- [ ] **Step 1: 创建 TaskScheduler.java**

```java
package com.agent.core.task;

import com.agent.dynamic.entity.ScheduledTask;
import com.agent.dynamic.entity.Task;
import com.agent.dynamic.mapper.ScheduledTaskMapper;
import com.agent.dynamic.mapper.TaskMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class TaskScheduler {

    @Autowired
    private ScheduledTaskMapper scheduledTaskMapper;

    @Autowired
    private TaskMapper taskMapper;

    @Autowired
    private TaskExecutor taskExecutor;

    @Scheduled(fixedDelay = 10000)
    public void pollScheduledTasks() {
        List<ScheduledTask> tasks = scheduledTaskMapper.selectList(
            new LambdaQueryWrapper<ScheduledTask>()
                .eq(ScheduledTask::getEnabled, true)
        );

        for (ScheduledTask st : tasks) {
            if (shouldRun(st)) {
                executeTask(st);
            }
        }
    }

    private boolean shouldRun(ScheduledTask task) {
        // Cron 解析判断是否应该执行
        return true;
    }

    private void executeTask(ScheduledTask st) {
        Task task = new Task();
        task.setName(st.getName());
        task.setSkillId(st.getSkillId());
        task.setParams(st.getParams());
        task.setStatus("PENDING");
        taskMapper.insert(task);

        taskExecutor.execute(task);
    }
}
```

- [ ] **Step 2: 创建 TaskExecutor.java**

```java
package com.agent.core.task;

import com.agent.dynamic.entity.Task;
import com.agent.dynamic.mapper.TaskMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TaskExecutor {

    @Autowired
    private TaskMapper taskMapper;

    @Autowired
    private SkillExecutor skillExecutor;

    public void execute(Task task) {
        task.setStatus("RUNNING");
        taskMapper.updateById(task);

        try {
            Object result = skillExecutor.execute(task.getSkillId(), task.getParams());
            task.setStatus("COMPLETED");
            task.setResult(String.valueOf(result));
        } catch (Exception e) {
            task.setStatus("FAILED");
            task.setErrorMsg(e.getMessage());
        }

        taskMapper.updateById(task);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add task scheduler"
```

---

### Task 12: RAG 服务

**Files:**
- Create: `backend/src/main/java/com/agent/core/rag/RagService.java`

- [ ] **Step 1: 创建 RagService.java**

```java
package com.agent.core.rag;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.*;
import java.util.*;

@Service
public class RagService {

    @Value("${agent.knowledge.path}")
    private String knowledgePath;

    public String retrieve(String query) {
        List<String> files = listFiles(knowledgePath);
        List<SearchResult> results = new ArrayList<>();

        for (String file : files) {
            String content = readFile(file);
            double score = calculateSimilarity(query, content);
            results.add(new SearchResult(file, content, score));
        }

        results.sort((a, b) -> Double.compare(b.score, a.score));
        return buildContext(results.subList(0, Math.min(3, results.size())));
    }

    private List<String> listFiles(String dir) {
        // 递归列出所有文本文件
    }

    private String readFile(String path) {
        try {
            return Files.readString(Path.of(path));
        } catch (IOException e) {
            return "";
        }
    }

    private double calculateSimilarity(String query, String content) {
        // 简单关键词匹配，可升级为向量化
        return 0.0;
    }

    private String buildContext(List<SearchResult> results) {
        StringBuilder sb = new StringBuilder("相关知识：\n");
        for (SearchResult r : results) {
            sb.append("文件: ").append(r.path).append("\n");
            sb.append(r.content).append("\n---\n");
        }
        return sb.toString();
    }

    private record SearchResult(String path, String content, double score) {}
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add RAG service"
```

---

## Phase 2: 前端开发

### Task 13: 前端页面

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/pages/Chat.tsx`
- Create: `frontend/src/pages/SkillManage.tsx`
- Create: `frontend/src/pages/McpManage.tsx`
- Create: `frontend/src/services/api.ts`

- [ ] **Step 1: 创建 api.ts**

```typescript
const API_BASE = '/api';

export const sendMessage = (chatId: number, content: string) =>
  fetch(`${API_BASE}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, content })
  }).then(r => r.json());

export const getHistory = (chatId: number) =>
  fetch(`${API_BASE}/chat/history/${chatId}`).then(r => r.json());

export const getSkills = () =>
  fetch(`${API_BASE}/skill/list`).then(r => r.json());

export const saveSkill = (skill: any) =>
  fetch(`${API_BASE}/skill/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(skill)
  }).then(r => r.json());
```

- [ ] **Step 2: 创建 Chat.tsx**

```typescript
import { useState, useEffect } from 'react';
import { ChatContainer, MessageList, MessageInput, Button } from 'antd';

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [chatId] = useState(1);

  const send = async () => {
    const { response } = await sendMessage(chatId, input);
    setMessages([...messages, { role: 'user', content: input }, { role: 'assistant', content: response }]);
    setInput('');
  };

  return (
    <div>
      <MessageList messages={messages} />
      <MessageInput value={input} onChange={setInput} />
      <Button onClick={send}>发送</Button>
    </div>
  );
}
```

- [ ] **Step 3: 创建其他管理页面（同理）**

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add frontend pages"
```

---

### Task 14: Python MCP Server

**Files:**
- Create: `mcp-server/server.py`

- [ ] **Step 1: 创建 server.py**

```python
from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

@app.route('/execute', methods=['POST'])
def execute():
    data = request.json
    tool = data.get('tool')
    params = data.get('params', {})

    if tool == 'exec':
        cmd = params.get('cmd')
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return jsonify({ 'success': True, 'result': result.stdout, 'error': result.stderr })

    return jsonify({ 'success': False, 'error': 'Unknown tool' })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9000)
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add MCP server"
```

---

## 分阶段说明

| Phase | 任务 | 说明 |
|-------|------|------|
| **Phase 1** | Task 1-5 | 项目初始化 + 数据库 + 适配器 |
| **Phase 1** | Task 6-9 | Tool/Skill 注册 + Agent + 聊天 |
| **Phase 1** | Task 10-12 | 记忆 + 调度 + RAG |
| **Phase 2** | Task 13-14 | 前端 + MCP Server |

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-10-agent-implementation.md`**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**