package com.fast.agent.runtime;

import java.util.*;
import java.time.Duration;
import reactor.core.publisher.Flux;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fast.agent.runtime.tools.ToolRegistry;

@Component
public class LLMAgent {

    @Autowired private LLMProvider llmAdapter;

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

        for (int i = 0; i < MAX_LOPS; i++) {
            LLMResponse response = llmAdapter.chat(messages);

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

        for (int i = 0; i < MAX_LOPS; i++) {
            callback.onProgress("Thinking...", Map.of("step", i, "total", MAX_LOPS));

            LLMResponse response = llmAdapter.chat(messages);

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