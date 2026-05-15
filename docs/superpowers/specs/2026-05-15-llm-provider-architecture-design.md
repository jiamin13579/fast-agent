# LLM Provider 架构设计

## 概述

将 LLM 调用从单一 `LLMClient` 类重构为可扩展的 Provider 架构，支持按配置切换不同 LLM 实现（当前支持 OpenAI 协议和 Mock）。

## 架构图

```
LLMAgent
    ↓
LLMProviderFactory  ──getProvider(name)──►  LLMProvider (interface)
                                              ├── OpenAIProvider
                                              └── MockProvider
```

## 核心接口

### `LLMProvider`

```java
public interface LLMProvider {
    String getName();       // provider 标识："openai" | "mock"
    String getModel();      // 模型名称

    LLMResponse chat(List<Map<String, String>> messages);
    Flux<String> chatStream(List<Map<String, String>> messages);
}
```

## 实现类

### 1. OpenAIProvider

- 实现 OpenAI Chat Completions API（兼容 MiniMax 等 OpenAI 兼容接口）
- 配置项：
  - `agent.llm.model` — 模型名
  - `agent.llm.base-url` — API 地址
  - `agent.llm.api-key` — API Key
- 通过 `WebClient` 发送 HTTP 请求，支持流式 SSE

### 2. MockProvider

- 用于开发/测试，不调用真实 LLM API
- **预设问答对**（代码写死，5 组）：
  1. "你好" → "你好！有什么可以帮助你的吗？"
  2. "你是谁" → "我是一个 AI 助手，由 Fast Agent 提供支持。"
  3. "代码" → "我来帮你写代码。请告诉我你需要什么功能的代码？"
  4. "解释" → "好的，让我来解释一下这个概念..."
  5. 默认 → "这是一个模拟响应，内容正在生成中..."
- **流式行为**：每个中文字符作为一个 chunk 返回
- **随机延迟**：每个 chunk 返回前随机等待 50-200ms（均匀分布）

## LLMProviderFactory

```java
@Component
public class LLMProviderFactory {
    @Value("${agent.llm.provider:mock}")
    private String defaultProvider;

    public LLMProvider getDefaultProvider();
    public LLMProvider getProvider(String name);  // 按 name 查找，不存在抛异常
}
```

## 配置（application.yml）

```yaml
agent:
  llm:
    provider: ${LLM_PROVIDER:mock}       # "openai" | "mock"
    model: ${LLM_MODEL:gpt-4o}
    api-key: ${LLM_API_KEY:your-key}
    base-url: ${LLM_BASE_URL:https://api.openai.com/v1}
```

## 文件变更

### 新增

| 文件 | 说明 |
|------|------|
| `runtime/LLMProvider.java` | 接口 |
| `runtime/OpenAIProvider.java` | OpenAI 协议实现 |
| `runtime/MockProvider.java` | Mock 实现 |
| `runtime/LLMProviderFactory.java` | 工厂 |

### 重命名

| 原文件 | 新文件 | 说明 |
|--------|--------|------|
| `runtime/LLMClient.java` | `runtime/OpenAIProvider.java` | 重构为 Provider 实现 |

### 修改

| 文件 | 变更 |
|------|------|
| `runtime/LLMAgent.java` | 注入 `LLMProviderFactory`，调用 `getDefaultProvider()` 获取当前 provider |
| `runtime/LLMResponse.java` | 不变 |
| `service/ConversationService.java` | 不变（已通过 LLMProvider 接口调用） |

## MockProvider 预设问答

```java
private static final List<MockQA> MOCK_QAS = List.of(
    new MockQA("你好", "你好！有什么可以帮助你的吗？"),
    new MockQA("你是谁", "我是一个 AI 助手，由 Fast Agent 提供支持。"),
    new MockQA("代码", "我来帮你写代码。请告诉我你需要什么功能的代码？"),
    new MockQA("解释", "好的，让我来解释一下这个概念..."),
    new MockQA(".*", "这是一个模拟响应，内容正在生成中...")
);
```

匹配规则：按顺序首次匹配即返回，正则 `.*` 作为默认兜底。

## 流式返回伪代码

```java
public Flux<String> chatStream(List<Map<String, String>> messages) {
    String userMsg = extractUserMessage(messages);
    String response = matchResponse(userMsg);

    return Flux.interval(0, randomDelay(50, 200), TimeUnit.MILLISECONDS)
        .take(response.length())
        .map(i -> String.valueOf(response.charAt(i.intValue())));
}
```

实际使用 `Flux.create()` + `Sinks.Many` 实现更精确控制。

## 边界情况

| 场景 | 处理 |
|------|------|
| provider name 不存在 | 抛 `IllegalArgumentException` |
| MockProvider 匹配到默认回复 | 返回最后一个预设（正则 `.*`） |
| 流式过程中异常 | `Flux.error()` 传播错误 |

## 迁移步骤

1. 新建 `LLMProvider` 接口，将 `LLMClient` 方法签名提取到接口
2. 新建 `OpenAIProvider`（内容同现有 `LLMClient`），删除原 `LLMClient`
3. 新建 `MockProvider`
4. 新建 `LLMProviderFactory`
5. 修改 `LLMAgent` 注入工厂，调用 provider
6. 验证流式响应功能正常