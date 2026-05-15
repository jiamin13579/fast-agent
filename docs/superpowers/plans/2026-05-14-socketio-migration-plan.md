# SocketIO Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native WebSocket with SocketIO, implement HTTP REST + SocketIO hybrid architecture with room-based push notifications

**Architecture:**
- HTTP REST for request-response operations (send message, manage conversations)
- SocketIO with root Namespace `/` for room management and server-initiated push notifications
- Rooms: `conversation:{uuid}`, `agent:{uuid}`, `global:notifications`

**Tech Stack:**
- Backend: Spring Boot 3.2.5, Netty-socketio 1.7.20, MyBatis Plus
- Frontend: Next.js 14, socket.io-client

---

## File Structure

### Backend Changes
```
backend/src/main/java/com/fast/agent/
├── config/
│   └── SocketIOConfig.java          # [NEW] SocketIO server configuration
├── ws/
│   └── ConversationSocketIOHandler.java  # [NEW] SocketIO event handler
├── service/
│   ├── ConversationService.java     # [MODIFY] Add push notification support
│   └── SocketIOPushService.java    # [NEW] Unified push service
└── pom.xml                         # [MODIFY] Already has netty-socketio
```

### Frontend Changes
```
frontend/src/
├── lib/
│   ├── socket.ts                   # [NEW] SocketIO connection management
│   └── api.ts                      # [MODIFY] REST API calls (consolidate)
└── components/layout.tsx           # [MODIFY] Integrate socket.io-client
```

---

## Task 1: Backend - SocketIO Server Configuration

**Files:**
- Create: `backend/src/main/java/com/fast/agent/config/SocketIOConfig.java`
- Modify: `backend/pom.xml` (verify netty-socketio version)

- [ ] **Step 1: Verify pom.xml has netty-socketio dependency**

```xml
<dependency>
    <groupId>com.github</groupId>
    <artifactId>netty-socketio</artifactId>
    <version>1.7.22</version>
</dependency>
```

Run: `grep -A2 "netty-socketio" backend/pom.xml`
Expected: `<version>1.7.20</version>` (current) or newer

- [ ] **Step 2: Create SocketIOConfig.java**

```java
package com.fast.agent.config;

import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SocketIOConfig {

    @Value("${socketio.port:8080}")
    private int port;

    @Bean
    public SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        config.setPort(port);
        config.setContext("/");
        
        // Enable heartbeat for connection health
        config.setHeartbeatInterval(25);
        config.setHeartbeatTimeout(60);
        
        SocketIOServer server = new SocketIOServer(config);
        server.addNamespace("/");
        
        return server;
    }
}
```

Package is `com.corundumstudio.socketio`.

- [ ] **Step 3: Verify imports work**

Run: `cd backend && mvn compile -q 2>&1 | head -20`
Expected: No errors related to netty-socketio

- [ ] **Step 4: Commit**

```bash
git add backend/pom.xml backend/src/main/java/com/fast/agent/config/SocketIOConfig.java
git commit -m "feat(socketio): add SocketIO server configuration with root namespace"
```

---

## Task 2: Backend - SocketIO Event Handler

**Files:**
- Create: `backend/src/main/java/com/fast/agent/ws/ConversationSocketIOHandler.java`
- Modify: `backend/src/main/java/com/fast/agent/config/SocketIOConfig.java` (wire handler)

- [ ] **Step 1: Create ConversationSocketIOHandler.java**

```java
package com.fast.agent.ws;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.annotation.OnEvent;
import com.fast.agent.service.ConversationService;
import com.fast.agent.service.SocketIOPushService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ConversationSocketIOHandler {

    private final SocketIOServer socketIOServer;
    private final ConversationService conversationService;
    private final SocketIOPushService pushService;

    @OnEvent("join")
    public void onJoin(SocketIOClient client, String room) {
        client.joinRoom(room);
        log.info("Client {} joined room: {}", client.getSessionId(), room);
    }

    @OnEvent("leave")
    public void onLeave(SocketIOClient client, String room) {
        client.leaveRoom(room);
        log.info("Client {} left room: {}", client.getSessionId(), room);
    }

    @OnEvent("auth")
    public void onAuth(SocketIOClient client, String token) {
        // TODO: Validate token and associate client with user
        log.info("Client {} authenticated with token", client.getSessionId());
    }

    @OnConnect
    public void onConnect(SocketIOClient client) {
        log.info("Client connected: {}", client.getSessionId());
    }

    @OnDisconnect
    public void onDisconnect(SocketIOClient client) {
        log.info("Client disconnected: {}", client.getSessionId());
    }
}
```

Note: netty-socketio uses different package `com.corundumstudio.socketio`.

- [ ] **Step 2: Wire handler into SocketIOConfig**

Update SocketIOConfig.java to add the handler:

```java
@Configuration
@RequiredArgsConstructor
public class SocketIOConfig {
    private final ConversationSocketIOHandler conversationSocketIOHandler;

    @Bean
    public SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        config.setPort(port);
        config.setContext("/");
        config.setHeartbeatInterval(25);
        config.setHeartbeatTimeout(60);
        
        SocketIOServer server = new SocketIOServer(config);
        server.addNamespace("/").addListeners(conversationSocketIOHandler);
        
        server.start();
        return server;
    }
}
```

- [ ] **Step 3: Compile check**

Run: `cd backend && mvn compile -q 2>&1 | head -30`
Expected: Errors about missing `SocketIOPushService` (will create in next task)

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/fast/agent/ws/ConversationSocketIOHandler.java
git commit -m "feat(socketio): add ConversationSocketIOHandler for room management"
```

---

## Task 3: Backend - SocketIOPushService

**Files:**
- Create: `backend/src/main/java/com/fast/agent/service/SocketIOPushService.java`

- [ ] **Step 1: Create SocketIOPushService.java**

```java
package com.fast.agent.service;

import com.corundumstudio.socketio.SocketIOServer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SocketIOPushService {

    private final SocketIOServer socketIOServer;

    public void pushToRoom(String room, String event, Object data) {
        try {
            socketIOServer.getNamespace("/").getRoomOperations(room).sendEvent(event, data);
            log.debug("Pushed event {} to room {}", event, room);
        } catch (Exception e) {
            log.error("Failed to push to room {}: {}", room, e.getMessage());
        }
    }

    public void pushNewMessage(String conversationUuid, Object message) {
        pushToRoom("conversation:" + conversationUuid, "new_message", message);
    }

    public void pushAgentProgress(String conversationUuid, Object progress) {
        pushToRoom("agent:" + conversationUuid, "agent_progress", progress);
    }

    public void pushSync(String conversationUuid, Object syncData) {
        pushToRoom("conversation:" + conversationUuid, "sync", syncData);
        pushToRoom("global:notifications", "sync", syncData);
    }

    public void pushStreamChunk(String conversationUuid, String messageUuid, String content) {
        pushToRoom("conversation:" + conversationUuid, "stream_chunk", Map.of(
            "message_uuid", messageUuid,
            "content", content
        ));
    }

    public void pushStreamDone(String conversationUuid, String messageUuid, String fullContent) {
        pushToRoom("conversation:" + conversationUuid, "stream_done", Map.of(
            "message_uuid", messageUuid,
            "full_content", fullContent
        ));
    }
}
```

Note: Need to add `import java.util.Map;` at the top.

- [ ] **Step 2: Compile check**

Run: `cd backend && mvn compile -q 2>&1`
Expected: Clean compile (no errors)

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/fast/agent/service/SocketIOPushService.java
git commit -m "feat(socketio): add SocketIOPushService for unified push operations"
```

---

## Task 4: Backend - Integrate Push with ConversationService

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/service/ConversationService.java`

- [ ] **Step 1: Add push trigger to send() method**

Read current `ConversationService.java` and add push:

```java
@Autowired
private SocketIOPushService pushService;

// After saving user message and assistant message in send()
public Map<String, Object> send(String conversationUuid, String content) {
    Conversation conversation = conversationMapper.findByUuid(conversationUuid);
    if (conversation == null) {
        throw new IllegalArgumentException("会话不存在: " + conversationUuid);
    }

    // Generate response and save messages
    String response = generateResponse(conversationUuid, content);

    ChatMessage userMsg = new ChatMessage();
    userMsg.setUuid(UUID.randomUUID().toString());
    userMsg.setConversationUuid(conversationUuid);
    userMsg.setRole("user");
    userMsg.setContent(content);
    chatMessageMapper.insert(userMsg);

    ChatMessage assistantMsg = new ChatMessage();
    assistantMsg.setUuid(UUID.randomUUID().toString());
    assistantMsg.setConversationUuid(conversationUuid);
    assistantMsg.setRole("assistant");
    assistantMsg.setContent(response);
    chatMessageMapper.insert(assistantMsg);

    // Push new message to room
    pushService.pushNewMessage(conversationUuid, Map.of(
        "message_uuid", assistantMsg.getUuid(),
        "role", "assistant",
        "content", response,
        "timestamp", assistantMsg.getCreatedAt().toString()
    ));

    return Map.of("response", response);
}
```

Also add: `import java.util.Map;` at top if not present.

- [ ] **Step 2: Add push for conversation CRUD operations**

Add push after create, delete, rename operations:

```java
public Map<String, Object> createConversation(String name) {
    Conversation conversation = new Conversation();
    conversation.setUuid(UUID.randomUUID().toString());
    conversation.setName(name == null || name.isBlank() ? "新会话" : name);
    conversationMapper.insert(conversation);
    
    // Push sync notification
    pushService.pushSync(conversation.getUuid(), Map.of(
        "action", "create",
        "conversation", Map.of("uuid", conversation.getUuid(), "name", conversation.getName())
    ));
    
    return Map.of("uuid", conversation.getUuid(), "name", conversation.getName());
}

public Map<String, Object> deleteConversation(String conversationUuid) {
    chatMessageMapper.deleteByConversationUuid(conversationUuid);
    Conversation conversation = conversationMapper.findByUuid(conversationUuid);
    if (conversation != null) {
        conversationMapper.deleteById(conversation.getId());
    }
    
    // Push sync notification
    pushService.pushSync(conversationUuid, Map.of(
        "action", "delete",
        "conversation", Map.of("uuid", conversationUuid)
    ));
    
    return Map.of("success", true);
}

public Map<String, Object> renameConversation(String conversationUuid, String name) {
    if (name == null || name.isBlank()) {
        throw new IllegalArgumentException("name 不能为空");
    }
    Conversation conversation = conversationMapper.findByUuid(conversationUuid);
    if (conversation == null) {
        throw new IllegalArgumentException("会话不存在: " + conversationUuid);
    }
    conversation.setName(name);
    conversationMapper.updateById(conversation);
    
    // Push sync notification
    pushService.pushSync(conversationUuid, Map.of(
        "action", "rename",
        "conversation", Map.of("uuid", conversationUuid, "name", name)
    ));
    
    return Map.of("success", true, "name", name);
}
```

- [ ] **Step 3: Compile and test**

Run: `cd backend && mvn compile -q 2>&1`
Expected: Clean compile

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/fast/agent/service/ConversationService.java
git commit -m "feat(socketio): integrate push notifications into ConversationService"
```

---

## Task 5: Frontend - SocketIO Client

**Files:**
- Create: `frontend/src/lib/socket.ts`

- [ ] **Step 1: Install socket.io-client**

Run: `cd frontend && npm install socket.io-client`
Expected: Package installed successfully

- [ ] **Step 2: Create socket.ts**

```typescript
"use client";

import { io, Socket } from "socket.io-client";
import { getToken } from "./auth";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("/", {
      transports: ["websocket"],
      auth: { token: getToken() },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("SocketIO connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("SocketIO disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("SocketIO connection error:", error.message);
    });
  }
  return socket;
}

export function joinRoom(room: string) {
  getSocket().emit("join", room);
}

export function leaveRoom(room: string) {
  getSocket().emit("leave", room);
}

export function onEvent(event: string, handler: (...args: unknown[]) => void) {
  getSocket().on(event, handler);
}

export function offEvent(event: string, handler?: (...args: unknown[]) => void) {
  if (handler) {
    getSocket().off(event, handler);
  } else {
    getSocket().off(event);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

- [ ] **Step 3: TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to socket.io-client

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/src/lib/socket.ts
git commit -m "feat(socketio): add SocketIO client with room management"
```

---

## Task 6: Frontend - Replace WebSocket with SocketIO

**Files:**
- Modify: `frontend/src/components/layout.tsx`

- [ ] **Step 1: Read current layout.tsx to understand WebSocket usage**

Read `frontend/src/components/layout.tsx` to find:
- How `useWs` hook is used
- Message handling patterns
- State updates on WebSocket messages

- [ ] **Step 2: Replace useWs with socket.io-client**

Replace the WebSocket import and hook usage:

```typescript
// OLD import
import { useWs } from "@/lib/ws";

// NEW imports
import { getSocket, joinRoom, leaveRoom, onEvent, offEvent } from "@/lib/socket";
```

- [ ] **Step 3: Update component to use socket.io-client**

In the component that uses `useWs(onMessage)`:

```typescript
// OLD
const { send } = useWs(handleMessage);

// NEW - use useEffect for socket event handling
useEffect(() => {
  const socket = getSocket();
  
  const handleNewMessage = (data: unknown) => {
    // Handle new_message event
    handleMessage(data as Record<string, unknown>);
  };
  
  const handleStreamChunk = (data: unknown) => {
    // Handle stream_chunk event
    handleMessage(data as Record<string, unknown>);
  };

  onEvent("new_message", handleNewMessage);
  onEvent("stream_chunk", handleStreamChunk);
  onEvent("agent_progress", handleMessage);
  onEvent("sync", handleMessage);

  return () => {
    offEvent("new_message", handleNewMessage);
    offEvent("stream_chunk", handleStreamChunk);
    offEvent("agent_progress");
    offEvent("sync");
  };
}, [handleMessage]);
```

And for joining rooms when conversation changes:

```typescript
useEffect(() => {
  if (currentConversationUuid) {
    joinRoom(`conversation:${currentConversationUuid}`);
    joinRoom(`agent:${currentConversationUuid}`);
    
    return () => {
      leaveRoom(`conversation:${currentConversationUuid}`);
      leaveRoom(`agent:${currentConversationUuid}`);
    };
  }
}, [currentConversationUuid]);
```

- [ ] **Step 4: Update send function to use HTTP**

Replace WebSocket `send()` calls with HTTP fetch:

```typescript
// OLD
const sendMessage = (content: string) => {
  send({ action: "send", conversation_uuid: currentUuid, content });
};

// NEW
const sendMessage = async (content: string) => {
  const res = await fetch(`/api/conversation/${currentUuid}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to send message");
};
```

- [ ] **Step 5: Verify and test**

Run: `cd frontend && npm run dev`
Expected: No compile errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout.tsx
git commit -m "feat(socketio): replace WebSocket with socket.io-client in layout"
```

---

## Task 7: Integration Testing

**Files:**
- Test: Manual integration test checklist

- [ ] **Step 1: Start backend**

Run: `cd backend && mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8080"`

Wait for: "Started AgentApplication in X seconds"

- [ ] **Step 2: Start frontend**

Run: `cd frontend && npm run dev`

- [ ] **Step 3: Test socket connection**

Open browser DevTools, check for:
- Console shows "SocketIO connected: ..."
- Network shows WebSocket upgrade to `/socket.io/?EIO=...`

- [ ] **Step 4: Test message send**

1. Select a conversation
2. Send a message
3. Check:
   - HTTP POST `/api/conversation/{uuid}/messages` returns 200
   - SocketIO receives `new_message` event
   - UI updates with response

- [ ] **Step 5: Test room isolation**

1. Open two browser tabs with different conversations
2. Send message in tab A
3. Verify tab B does NOT receive the message (room isolation)

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/YYYY-MM-DD-socketio-migration-plan.md
git commit -m "docs: complete SocketIO migration implementation plan"
```

---

## Spec Coverage Checklist

- [x] SocketIO server configuration with root namespace `/`
- [x] Room join/leave management
- [x] HTTP REST API for message sending (existing `/api/conversation/*`)
- [x] `new_message` push on message sent
- [x] `sync` push on conversation CRUD
- [x] Frontend socket.io-client integration
- [x] Room-based message isolation
- [ ] `agent_progress` push (needs Agent integration - future task)
- [ ] `stream_chunk` / `stream_done` push (current uses streaming response - may reuse existing)
- [ ] `task_completed` push (future feature)

**Remaining tasks** are for future phases when Agent execution is refactored.

---

## Notes

1. **Existing WebSocket** (`/ws/conversation`) should be kept during migration for fallback
2. **Auth on SocketIO** - currently uses `auth.token` in connection, but actual validation not implemented
3. **流式响应** - current streaming uses separate mechanism; SocketIO push for streaming can be added later
4. **netty-socketio version** - pom.xml has 1.7.20, design spec says 1.7.22, can upgrade later