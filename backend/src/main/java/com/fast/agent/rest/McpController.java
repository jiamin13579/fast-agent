package com.fast.agent.rest;

import com.fast.agent.entity.McpServer;
import com.fast.agent.service.McpService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mcp")
public class McpController {

    @Autowired private McpService mcpService;

    @GetMapping("/list")
    public List<McpServer> list() {
        return mcpService.list();
    }

    @PostMapping("/save")
    public Object save(@RequestBody McpServer server) {
        return mcpService.save(server);
    }

    @PostMapping("/test/{id}")
    public Object test(@PathVariable Long id) {
        return mcpService.test(id);
    }

    @DeleteMapping("/{id}")
    public Object delete(@PathVariable Long id) {
        return mcpService.delete(id);
    }
}
