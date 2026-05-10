package com.agent.mcp;

import lombok.Data;
import java.util.Map;

@Data
public class McpRequest {
    private String tool;
    private Map<String, Object> params;

    public McpRequest() {}

    public McpRequest(String tool, Map<String, Object> params) {
        this.tool = tool;
        this.params = params;
    }
}