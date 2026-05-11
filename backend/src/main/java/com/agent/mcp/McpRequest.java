package com.agent.mcp;

import java.util.Map;
import lombok.Data;

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
