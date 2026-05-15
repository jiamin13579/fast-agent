# 会话与用户绑定 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** conversation 表新增 user_id 字段，创建会话自动绑定当前用户，列表/操作按用户隔离。

**架构：** 后端会话层绑定——conversation 表加 user_id；Entity/Mapper/Service/Controller 四层联动，从 SecurityContext 获取当前用户 ID。

**技术栈：** Spring Boot 3 + MyBatis-Plus + MySQL + Spring Security

**前置条件：** 规格文档已审批通过：`docs/superpowers/specs/2026-05-15-session-user-binding-design.md`

---

### 任务 1：数据库 schema 变更

**文件：**
- 修改：`backend/src/main/resources/schema.sql`

- [ ] **步骤 1：在 conversation 表添加 user_id 列和索引**

修改 `schema.sql` 中 `conversation` 表定义，在 `id` 后增加 `user_id` 列及索引：

```sql
CREATE TABLE IF NOT EXISTS conversation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL DEFAULT 1,
    uuid VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_uuid (uuid),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> 已有表需要手动执行迁移 SQL：
> ```sql
> ALTER TABLE conversation
>     ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1 AFTER id,
>     ADD INDEX idx_user_id (user_id);
> ```

- [ ] **步骤 2：验证 schema.sql 语法正确**

运行：在 IDE 中确认 SQL 无语法错误，或通过 `application.yml` 确认 spring.datasource 配置可用。

---

### 任务 2：Conversation 实体添加 userId 字段

**文件：**
- 修改：`backend/src/main/java/com/fast/agent/entity/Conversation.java`

- [ ] **步骤 1：新增 userId 字段**

```java
package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("conversation")
public class Conversation {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("user_id")
    private Long userId;
    private String uuid;
    private String name;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
```

- [ ] **步骤 2：编译验证**

运行：`cd backend && mvn compile -q`
预期：BUILD SUCCESS

---

### 任务 3：ConversationMapper 新增按用户查询方法

**文件：**
- 修改：`backend/src/main/java/com/fast/agent/repository/ConversationMapper.java`

- [ ] **步骤 1：新增 findByUserId 和 findByUuidAndUserId，移除 findAll**

```java
package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.Conversation;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ConversationMapper extends BaseMapper<Conversation> {

    default Conversation findByUuid(String uuid) {
        return selectOne(Wrappers.<Conversation>lambdaQuery().eq(Conversation::getUuid, uuid));
    }

    default List<Conversation> findByUserId(Long userId) {
        return selectList(
                Wrappers.<Conversation>lambdaQuery()
                        .eq(Conversation::getUserId, userId)
                        .orderByDesc(Conversation::getCreatedAt));
    }

    default Conversation findByUuidAndUserId(String uuid, Long userId) {
        return selectOne(
                Wrappers.<Conversation>lambdaQuery()
                        .eq(Conversation::getUuid, uuid)
                        .eq(Conversation::getUserId, userId));
    }
}
```

- [ ] **步骤 2：编译验证**

运行：`cd backend && mvn compile -q`
预期：BUILD SUCCESS

---

### 任务 4：ConversationService 接入用户绑定与所有权校验

**文件：**
- 修改：`backend/src/main/java/com/fast/agent/service/ConversationService.java`

- [ ] **步骤 1：重写所有方法——创建绑定用户、列表按用户过滤、操作校验所有权**

```java
package com.fast.agent.service;

import com.fast.agent.runtime.LLMAgent;
import com.fast.agent.runtime.LLMClient;
import com.fast.agent.entity.ChatMessage;
import com.fast.agent.entity.Conversation;
import com.fast.agent.repository.ChatMessageMapper;
import com.fast.agent.repository.ConversationMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;

@Service
public class ConversationService {

    @Autowired private LLMAgent llmAgent;

    @Autowired private MemoryService memoryService;

    @Autowired private ConversationMapper conversationMapper;

    @Autowired private ChatMessageMapper chatMessageMapper;

    @Autowired private SocketIOPushService pushService;

    @Autowired private LLMClient llmClient;

    public Map<String, Object> send(String conversationUuid, String content, String clientMsgId) {
        Long currentUserId = getCurrentUserId();
        Conversation conversation = conversationMapper.findByUuidAndUserId(conversationUuid, currentUserId);
        if (conversation == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }

        List<Map<String, String>> history = memoryService.getHistory(conversationUuid);
        List<Map<String, String>> messages = new ArrayList<>(history);
        messages.add(Map.of("role", "user", "content", content));

        ChatMessage userMsg = new ChatMessage();
        userMsg.setUuid(UUID.randomUUID().toString());
        userMsg.setConversationUuid(conversationUuid);
        userMsg.setRole("user");
        userMsg.setContent(content);
        chatMessageMapper.insert(userMsg);

        pushService.pushStreamEvent(conversationUuid, Map.of(
            "type", "start",
            "client_msg_id", clientMsgId
        ));

        StringBuilder fullContent = new StringBuilder();
        String assistantMsgUuid = UUID.randomUUID().toString();

        try {
            llmClient.chatStream(messages)
                .doOnNext(chunk -> {
                    fullContent.append(chunk);
                    pushService.pushStreamEvent(conversationUuid, Map.of(
                        "type", "chunk",
                        "content", chunk,
                        "client_msg_id", clientMsgId
                    ));
                })
                .blockLast();
        } catch (Exception e) {
            String partial = fullContent.toString();
            if (!partial.isEmpty()) {
                ChatMessage partialMsg = new ChatMessage();
                partialMsg.setUuid(assistantMsgUuid);
                partialMsg.setConversationUuid(conversationUuid);
                partialMsg.setRole("assistant");
                partialMsg.setContent(partial);
                partialMsg.setCreatedAt(java.time.LocalDateTime.now());
                chatMessageMapper.insert(partialMsg);
            }
            pushService.pushStreamEvent(conversationUuid, Map.of(
                "type", "error",
                "message", e.getMessage(),
                "client_msg_id", clientMsgId
            ));
            return Map.of("response", partial);
        }

        String response = fullContent.toString();

        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setUuid(assistantMsgUuid);
        assistantMsg.setConversationUuid(conversationUuid);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(response);
        assistantMsg.setCreatedAt(java.time.LocalDateTime.now());
        chatMessageMapper.insert(assistantMsg);

        pushService.pushStreamEvent(conversationUuid, Map.of(
            "type", "done",
            "message_uuid", assistantMsgUuid,
            "client_msg_id", clientMsgId
        ));

        return Map.of("response", response);
    }

    public String generateResponse(String conversationUuid, String content) {
        checkOwnership(conversationUuid);
        List<Map<String, String>> history = memoryService.getHistory(conversationUuid);
        try {
            return llmAgent.process(content, history);
        } catch (Exception e) {
            return "LLM 服务暂不可用，请检查 agent.llm 配置或网络后重试。";
        }
    }

    public Flux<String> streamResponse(String conversationUuid, String content) {
        checkOwnership(conversationUuid);
        List<Map<String, String>> history = memoryService.getHistory(conversationUuid);
        return llmAgent.processStreamFlux(content, history);
    }

    public List<ChatMessage> getHistory(String conversationUuid) {
        checkOwnership(conversationUuid);
        return chatMessageMapper.findByConversationUuid(conversationUuid);
    }

    public Map<String, Object> createConversation(String name) {
        Long currentUserId = getCurrentUserId();
        Conversation conversation = new Conversation();
        conversation.setUserId(currentUserId);
        conversation.setUuid(UUID.randomUUID().toString());
        conversation.setName(name == null || name.isBlank() ? "新会话" : name);
        conversationMapper.insert(conversation);

        pushService.pushSync(conversation.getUuid(), Map.of(
            "action", "create",
            "uuid", conversation.getUuid(),
            "name", conversation.getName()
        ));

        return Map.of(
                "uuid",
                conversation.getUuid(),
                "name",
                conversation.getName());
    }

    public List<Conversation> listConversations() {
        Long currentUserId = getCurrentUserId();
        return conversationMapper.findByUserId(currentUserId);
    }

    public Map<String, Object> deleteConversation(String conversationUuid) {
        Long currentUserId = getCurrentUserId();
        Conversation conversation = conversationMapper.findByUuidAndUserId(conversationUuid, currentUserId);
        if (conversation == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }

        chatMessageMapper.deleteByConversationUuid(conversationUuid);
        conversationMapper.deleteById(conversation.getId());

        pushService.pushSync(conversationUuid, Map.of(
            "action", "delete",
            "uuid", conversationUuid
        ));

        return Map.of("success", true);
    }

    public Map<String, Object> renameConversation(String conversationUuid, String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name 不能为空");
        }

        Long currentUserId = getCurrentUserId();
        Conversation conversation = conversationMapper.findByUuidAndUserId(conversationUuid, currentUserId);
        if (conversation == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }

        conversation.setName(name);
        conversationMapper.updateById(conversation);

        pushService.pushSync(conversationUuid, Map.of(
            "action", "rename",
            "uuid", conversationUuid,
            "name", name
        ));

        return Map.of("success", true, "name", name);
    }

    private Long getCurrentUserId() {
        String userId = (String) org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return Long.parseLong(userId);
    }

    private void checkOwnership(String conversationUuid) {
        Long currentUserId = getCurrentUserId();
        Conversation conversation = conversationMapper.findByUuidAndUserId(conversationUuid, currentUserId);
        if (conversation == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }
    }
}
```

- [ ] **步骤 2：编译验证**

运行：`cd backend && mvn compile -q`
预期：BUILD SUCCESS

---

### 任务 5：编译验证整体

**文件：**
- 修改：无（编译验证）

- [ ] **步骤 1：完整编译**

运行：`cd backend && mvn compile -q`
预期：BUILD SUCCESS
