package com.agent.core.tool;

import com.agent.mcp.McpGateway;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
public class McpTool {

    @Autowired
    private McpGateway mcpGateway;

    @Tool(name = "execute_command", description = "执行远程服务器命令")
    public String executeCommand(
            @Param(name = "server", description = "服务器名称") String server,
            @Param(name = "command", description = "要执行的命令") String command) {
        return mcpGateway.execute("exec", Map.of("server", server, "cmd", command));
    }

    @Tool(name = "refresh_data", description = "重新拉取数据源")
    public String refreshData(
            @Param(name = "source", description = "数据源名称") String source) {
        return mcpGateway.execute("refresh", Map.of("source", source));
    }
}
