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

        try {
            // Parse args JSON to Map
            Map<String, Object> params = parseArgs(args);
            return toolRegistry.executeTool(name, params);
        } catch (Exception e) {
            return "Error executing tool: " + e.getMessage();
        }
    }

    private Map<String, Object> parseArgs(String argsJson) {
        if (argsJson == null || argsJson.isEmpty()) return new HashMap<>();
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                .readValue(argsJson, Map.class);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}