# LLM Provider 架构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 LLM 调用重构为 Provider 架构，支持 OpenAI 和 Mock 两种实现，通过配置切换

**Architecture:** 引入 `LLMProvider` 接口 + `LLMProviderFactory`，将现有 `LLMClient` 重构为 `OpenAIProvider`，新增 `MockProvider`

**Tech Stack:** Spring Boot, WebClient, Reactor Flux, SSE

---

## 文件变更总览

| 操作 | 文件路径 |
|------|---------|
| 创建 | `runtime/LLMProvider.java` |
| 创建 | `runtime/MockProvider.java` |
| 创建 | `runtime/LLMProviderFactory.java` |
| 重命名 | `runtime/LLMClient.java` → `runtime/OpenAIProvider.java` |
| 修改 | `runtime/LLMAgent.java` |

---

### Task 1: 创建 LLMProvider 接口

**文件:**
- 创建: `backend/src/main/java/com/fast/agent/runtime/LLMProvider.java`

- [ ] **Step 1: 创建接口文件**

```java
package com.fast.agent.runtime;

import java.util.List;
import java.util.Map;
import reactor.core.publisher.Flux;

public interface LLMProvider {
    String getName();
    String getModel();

    LLMResponse chat(List<Map<String, String>> messages);
    Flux<String> chatStream(List<Map<String, String>> messages);
}
```

- [ ] **Step 2: 提交**

```bash
git add backend/src/main/java/com/fast/agent/runtime/LLMProvider.java
git commit -m "feat: add LLMProvider interface"
```

---

### Task 2: 将 LLMClient 重构为 OpenAIProvider

**文件:**
- 创建: `backend/src/main/java/com/fast/agent/runtime/OpenAIProvider.java`
- 删除: `backend/src/main/java/com/fast/agent/runtime/LLMClient.java`

- [ ] **Step 1: 创建 OpenAIProvider（内容同现有 LLMClient）**

```java
package com.fast.agent.runtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

@Component
@Slf4j
public class OpenAIProvider implements LLMProvider {

    private final String model;
    private final String apiKey;
    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OpenAIProvider(
            @Value("${agent.llm.model:}") String model,
            @Value("${agent.llm.api-key:}") String apiKey,
            @Value("${agent.llm.base-url:}") String baseUrl) {
        this.model = model;
        this.apiKey = apiKey;
        this.webClient =
                WebClient.builder()
                        .baseUrl(baseUrl)
                        .defaultHeader("Authorization", "Bearer " + apiKey)
                        .build();
    }

    @Override
    public String getName() {
        return "openai";
    }

    @Override
    public String getModel() {
        return model;
    }

    @Override
    public LLMResponse chat(List<Map<String, String>> messages) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);

        String response =
                webClient
                        .post()
                        .uri("/v1/chat/completions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();

        return parseResponse(response);
    }

    @Override
    public Flux<String> chatStream(List<Map<String, String>> messages) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("stream", true);

        return webClient
                .post()
                .uri("/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .flatMap(data -> Flux.fromArray(data.split("\n")))
                .filter(line -> !line.isBlank())
                .filter(line -> line.startsWith("data:"))
                .map(line -> line.substring(5).trim())
                .filter(line -> !"[DONE]".equals(line))
                .map(line -> {
                    try {
                        JsonNode root = objectMapper.readTree(line);
                        JsonNode choices = root.get("choices");
                        if (choices != null && choices.isArray() && choices.size() > 0) {
                            JsonNode delta = choices.get(0).get("delta");
                            if (delta != null && delta.has("content")) {
                                return delta.get("content").asText();
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Failed to parse SSE chunk: {}", e.getMessage());
                    }
                    return "";
                })
                .filter(content -> !content.isEmpty());
    }

    private LLMResponse parseResponse(String response) {
        LLMResponse llmResponse = new LLMResponse();
        try {
            JsonNode root = objectMapper.readTree(response);

            JsonNode choices = root.get("choices");
            if (choices != null && choices.isArray() && choices.size() > 0) {
                JsonNode message = choices.get(0).get("message");
                if (message != null && message.has("content")) {
                    llmResponse.setContent(message.get("content").asText());
                }

                if (message.has("tool_calls")) {
                    List<Map<String, String>> toolCalls = new ArrayList<>();
                    for (JsonNode tc : message.get("tool_calls")) {
                        Map<String, String> call = new HashMap<>();
                        call.put("name", tc.get("function").get("name").asText());
                        call.put("arguments", tc.get("function").get("arguments").asText());
                        toolCalls.add(call);
                    }
                    llmResponse.setToolCalls(toolCalls);
                }
            }
        } catch (Exception e) {
            llmResponse.setContent("Error parsing response: " + e.getMessage());
        }
        return llmResponse;
    }
}
```

- [ ] **Step 2: 删除原 LLMClient.java**

```bash
git rm backend/src/main/java/com/fast/agent/runtime/LLMClient.java
```

- [ ] **Step 3: 提交**

```bash
git add backend/src/main/java/com/fast/agent/runtime/OpenAIProvider.java
git commit -m "refactor: rename LLMClient to OpenAIProvider implementing LLMProvider interface"
```

---

### Task 3: 创建 MockProvider

**文件:**
- 创建: `backend/src/main/java/com/fast/agent/runtime/MockProvider.java`

- [ ] **Step 1: 创建 MockProvider**

```java
package com.fast.agent.runtime;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Component
@Slf4j
public class MockProvider implements LLMProvider {

    private static final List<MockQA> MOCK_QAS = List.of(
        new MockQA("你好", "你好！有什么可以帮助你的吗？"),
        new MockQA("你是谁", "我是一个 AI 助手，由 Fast Agent 提供支持。"),
        new MockQA("代码", "我来帮你写代码。请告诉我你需要什么功能的代码？"),
        new MockQA("解释", "好的，让我来解释一下这个概念..."),
        new MockQA(".*", "这是一个模拟响应，内容正在生成中...")
    );

    private static final int MIN_DELAY_MS = 50;
    private static final int MAX_DELAY_MS = 200;
    private final Random random = new Random();

    @Override
    public String getName() {
        return "mock";
    }

    @Override
    public String getModel() {
        return "mock-model";
    }

    @Override
    public LLMResponse chat(List<Map<String, String>> messages) {
        String userMsg = extractUserMessage(messages);
        String response = matchResponse(userMsg);

        LLMResponse llmResponse = new LLMResponse();
        llmResponse.setContent(response);
        return llmResponse;
    }

    @Override
    public Flux<String> chatStream(List<Map<String, String>> messages) {
        String userMsg = extractUserMessage(messages);
        String response = matchResponse(userMsg);

        return Flux.create(sink -> {
            Thread.startVirtualThread(() -> {
                try {
                    for (int i = 0; i < response.length(); i++) {
                        if (sink.isCancelled()) {
                            return;
                        }
                        int delay = MIN_DELAY_MS + random.nextInt(MAX_DELAY_MS - MIN_DELAY_MS + 1);
                        TimeUnit.MILLISECONDS.sleep(delay);
                        sink.next(String.valueOf(response.charAt(i)));
                    }
                    sink.complete();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    sink.error(new RuntimeException("Mock stream interrupted"));
                }
            });
        });
    }

    private String extractUserMessage(List<Map<String, String>> messages) {
        if (messages == null || messages.isEmpty()) {
            return "";
        }
        for (int i = messages.size() - 1; i >= 0; i--) {
            Map<String, String> msg = messages.get(i);
            if ("user".equals(msg.get("role"))) {
                return msg.get("content");
            }
        }
        return "";
    }

    private String matchResponse(String userMsg) {
        for (MockQA qa : MOCK_QAS) {
            if (Pattern.matches(qa.pattern, userMsg)) {
                return qa.response;
            }
        }
        return MOCK_QAS.get(MOCK_QAS.size() - 1).response;
    }

    private static class MockQA {
        final String pattern;
        final String response;

        MockQA(String pattern, String response) {
            this.pattern = pattern;
            this.response = response;
        }
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add backend/src/main/java/com/fast/agent/runtime/MockProvider.java
git commit -m "feat: add MockProvider for development/testing with random delay streaming"
```

---

### Task 4: 创建 LLMProviderFactory

**文件:**
- 创建: `backend/src/main/java/com/fast/agent/runtime/LLMProviderFactory.java`

- [ ] **Step 1: 创建 LLMProviderFactory**

```java
package com.fast.agent.runtime;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

@Component
@Slf4j
public class LLMProviderFactory {

    @Value("${agent.llm.provider:mock}")
    private String defaultProviderName;

    @Autowired
    private Map<String, LLMProvider> providers;

    @PostConstruct
    public void init() {
        log.info("Available LLM providers: {}", providers.keySet());
        log.info("Default provider: {}", defaultProviderName);
    }

    public LLMProvider getDefaultProvider() {
        return getProvider(defaultProviderName);
    }

    public LLMProvider getProvider(String name) {
        LLMProvider provider = providers.get(name);
        if (provider == null) {
            throw new IllegalArgumentException("LLM provider not found: " + name);
        }
        return provider;
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add backend/src/main/java/com/fast/agent/runtime/LLMProviderFactory.java
git commit -m "feat: add LLMProviderFactory to switch providers by name"
```

---

### Task 5: 修改 LLMAgent 使用 Factory

**文件:**
- 修改: `backend/src/main/java/com/fast/agent/runtime/LLMAgent.java`

- [ ] **Step 1: 修改 LLMAgent 注入工厂而非直接 provider**

```java
package com.fast.agent.runtime;

import java.util.*;
import java.time.Duration;
import reactor.core.publisher.Flux;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fast.agent.runtime.tools.ToolRegistry;

@Component
public class LLMAgent {

    @Autowired private LLMProviderFactory providerFactory;

    @Autowired private ToolRegistry toolRegistry;

    private static final int MAX_LOPS = 10;

    private LLMProvider getProvider() {
        return providerFactory.getDefaultProvider();
    }

    public String process(String userMessage, List<Map<String, String>> history) {
        List<Map<String, String>> messages = new ArrayList<>(history);
        messages.add(Map.of("role", "user", "content", userMessage));

        LLMProvider provider = getProvider();

        for (int i = 0; i < MAX_LOPS; i++) {
            LLMResponse response = provider.chat(messages);

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

    public String processStream(String userMessage, List<Map<String, String>> history) {
        return process(userMessage, history);
    }

    public Flux<String> processStreamFlux(String userMessage, List<Map<String, String>> history) {
        List<Map<String, String>> messages = new ArrayList<>(history);
        messages.add(Map.of("role", "user", "content", userMessage));

        LLMProvider provider = getProvider();

        for (int i = 0; i < MAX_LOPS; i++) {
            LLMResponse response = provider.chat(messages);

            if (response.getToolCalls() == null || response.getToolCalls().isEmpty()) {
                return Flux.just(response.getContent());
            }

            for (Map<String, String> toolCall : response.getToolCalls()) {
                String toolName = toolCall.get("name");
                String args = toolCall.get("arguments");
                String result = executeTool(toolName, args);

                messages.add(Map.of("role", "tool", "name", toolName, "content", result));
            }
        }

        return Flux.just("已达到最大循环次数");
    }

    public Flux<String> processStreamFluxWithCallback(
            String userMessage, List<Map<String, String>> history, StreamCallback callback) {
        List<Map<String, String>> messages = new ArrayList<>(history);
        messages.add(Map.of("role", "user", "content", userMessage));
        StringBuilder fullContent = new StringBuilder();

        LLMProvider provider = getProvider();

        for (int i = 0; i < MAX_LOPS; i++) {
            callback.onProgress("Thinking...", Map.of("step", i, "total", MAX_LOPS));

            LLMResponse response = provider.chat(messages);

            if (response.getToolCalls() == null || response.getToolCalls().isEmpty()) {
                String content = response.getContent();
                fullContent.append(content);
                callback.onChunk(content);
                return Flux.just(fullContent.toString());
            }

            for (Map<String, String> toolCall : response.getToolCalls()) {
                String toolName = toolCall.get("name");
                String args = toolCall.get("arguments");
                callback.onProgress("Executing tool: " + toolName, Map.of("tool", toolName));
                String result = executeTool(toolName, args);

                messages.add(Map.of("role", "tool", "name", toolName, "content", result));
            }
        }

        return Flux.just("已达到最大循环次数");
    }

    private String executeTool(String toolName, String args) {
        return toolRegistry.execute(toolName, args);
    }

    public interface StreamCallback {
        void onChunk(String chunk);
        void onProgress(String status, Map<String, Object> metadata);
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add backend/src/main/java/com/fast/agent/runtime/LLMAgent.java
git commit -m "refactor: LLMAgent now uses LLMProviderFactory to get provider"
```

---

### Task 6: 验证编译通过

- [ ] **Step 1: 编译验证**

```bash
cd backend && mvn compile -q
```

期望：无错误输出

- [ ] **Step 2: 如编译失败，修复后提交 fixup commit**

---

## 验证计划

1. 启动后端：`mvn spring-boot:run`
2. 切换 provider 为 mock（默认）：前端发送消息，观察流式返回
3. 切换 provider 为 openai：配置真实 API Key，观察真实 LLM 响应
4. 检查日志确认 provider 加载正常：`Available LLM providers: {openai=..., mock=...}`

## 变更日志

| 时间 | 提交 | 说明 |
|------|------|------|
| - | `feat: add LLMProvider interface` | 接口 |
| - | `refactor: rename LLMClient to OpenAIProvider` | 重构 |
| - | `feat: add MockProvider for development/testing` | Mock 实现 |
| - | `feat: add LLMProviderFactory to switch providers` | 工厂 |
| - | `refactor: LLMAgent now uses LLMProviderFactory` | Agent 使用工厂 |