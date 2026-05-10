package com.agent.core.tool;

import lombok.Data;
import java.util.Map;

@Data
public class ToolDefinition {
    private String name;
    private String description;
    private Map<String, ParamDefinition> params;

    public ToolDefinition() {}

    public ToolDefinition(String name, String description, Map<String, ParamDefinition> params) {
        this.name = name;
        this.description = description;
        this.params = params;
    }
}
