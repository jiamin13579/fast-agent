package com.fast.agent.engine;

import com.fast.agent.engine.LLMResponse;
import com.fast.agent.engine.tools.ToolDefinition;
import com.fast.agent.engine.tools.ToolRegistry;
import java.util.*;
import java.time.Duration;
import reactor.core.publisher.Flux;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class LLMAgent {

    @Autowired private LLMClient llmAdapter;

    @Autowired private ToolRegistry toolRegistry;

    private static final int MAX_LOPS = 10;

    public String process(String userMessage, List<Map<String, String>> history) {
        List<Map<String, String>> messages = new ArrayList<>(history);
        messages.add(Map.of("role", "user", "content", userMessage));

        for (int i = 0; i < MAX_LOPS; i++) {
            LLMResponse response = llmAdapter.chat(messages);

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

        // 模拟流式响应，分块发送
        String mockResponse = generateMockResponse(userMessage);
        return Flux.interval(Duration.ofMillis(50))
                .take(mockResponse.length() / 3 + 1)
                .map(i -> {
                    int start = (int) (i * 3);
                    if (start >= mockResponse.length()) return "";
                    int end = Math.min(start + 3, mockResponse.length());
                    return mockResponse.substring(start, end);
                })
                .filter(s -> !s.isEmpty());
    }

    private String generateMockResponse(String userMessage) {
        // 模拟回复，根据用户输入生成相关回复
        String[] mockReplies = {
            "您好！感谢您的消息。我已收到您的输入：\"" + userMessage + "\"",
            "这是一个模拟的流式响应演示。我正在实时分块发送数据给您。",
            "当前系统处于演示模式，所有回复都是模拟生成的。",
            "在实际生产环境中，这里将连接真实的大模型服务。",
            "您可以配置 MiniMax 或其他 LLM 提供商来获得真实的 AI 对话体验。",
            "流式响应 (SSE) 可以让您实时看到 AI 逐字生成回复的过程。",
            "这种体验更加自然，就像在与真人对话一样。",
            "如果您需要帮助或有其他问题，请随时告诉我！"
        };
        Random random = new Random();
        int count = random.nextInt(3) + 4;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < count; i++) {
            sb.append(mockReplies[random.nextInt(mockReplies.length)]);
            if (i < count - 1) sb.append("\n\n");
        }
        return sb.toString();
    }

    private String executeTool(String name, String args) {
        ToolDefinition tool = toolRegistry.getTool(name);
        if (tool == null) return "Tool not found: " + name;

        try {
            Map<String, Object> params = parseArgs(args);
            return toolRegistry.executeTool(name, params);
        } catch (Exception e) {
            return "Error executing tool: " + e.getMessage();
        }
    }

    private Map<String, Object> parseArgs(String argsJson) {
        if (argsJson == null || argsJson.isEmpty()) return new HashMap<>();
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(argsJson, Map.class);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}