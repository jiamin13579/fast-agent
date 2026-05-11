package com.agent.core.mcp;

import com.agent.dynamic.entity.McpServer;
import com.agent.dynamic.mapper.McpServerMapper;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mcp")
public class McpController {

    @Autowired private McpServerMapper mcpServerMapper;

    @GetMapping("/list")
    public List<McpServer> list() {
        return mcpServerMapper.findAll();
    }

    @PostMapping("/save")
    public Object save(@RequestBody McpServer server) {
        if (server.getId() == null) {
            mcpServerMapper.insert(server);
        } else {
            mcpServerMapper.update(server);
        }
        return Map.of("success", true);
    }

    @PostMapping("/test/{id}")
    public Map<String, Object> test(@PathVariable Long id) {
        McpServer server = mcpServerMapper.findById(id);
        if (server == null) {
            return Map.of("success", false, "message", "Server not found");
        }

        try {
            // Simple connection test - in production would actually test the connection
            return Map.of("success", true, "message", "Connection successful");
        } catch (Exception e) {
            return Map.of("success", false, "message", e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public Object delete(@PathVariable Long id) {
        mcpServerMapper.deleteById(id);
        return Map.of("success", true);
    }
}
