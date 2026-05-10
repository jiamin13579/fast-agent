package com.agent.core.tool;

import org.springframework.stereotype.Component;
import java.util.*;
import java.lang.reflect.Method;

@Component
public class ToolRegistry {
    private final Map<String, ToolDefinition> tools = new HashMap<>();
    private final Map<String, Object> toolInstances = new HashMap<>();

    public void register(ToolDefinition tool, Object instance, Method method) {
        tools.put(tool.getName(), tool);
        toolInstances.put(tool.getName(), new ToolMethod(instance, method));
    }

    public List<ToolDefinition> getAllTools() {
        return new ArrayList<>(tools.values());
    }

    public ToolDefinition getTool(String name) {
        return tools.get(name);
    }

    public String executeTool(String name, Map<String, Object> args) {
        ToolMethod tm = toolInstances.get(name);
        if (tm == null) return "Tool not found: " + name;

        try {
            Object result = tm.method.invoke(tm.instance, args);
            return result != null ? result.toString() : "OK";
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    private record ToolMethod(Object instance, Method method) {}
}
