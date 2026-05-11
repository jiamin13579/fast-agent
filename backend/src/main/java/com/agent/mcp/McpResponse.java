package com.agent.mcp;

import lombok.Data;

@Data
public class McpResponse {
    private boolean success;
    private String result;
    private String error;

    public static McpResponse ok(String result) {
        McpResponse resp = new McpResponse();
        resp.setSuccess(true);
        resp.setResult(result);
        return resp;
    }

    public static McpResponse fail(String error) {
        McpResponse resp = new McpResponse();
        resp.setSuccess(false);
        resp.setError(error);
        return resp;
    }
}
