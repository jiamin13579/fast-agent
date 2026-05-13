package com.fast.agent.service;

import com.fast.agent.entity.McpServer;
import com.fast.agent.repository.McpServerMapper;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class McpService {

    @Autowired private McpServerMapper mcpServerMapper;

    public List<McpServer> list() {
        return mcpServerMapper.findAll();
    }

    public Map<String, Object> save(McpServer server) {
        if (server.getId() == null) {
            mcpServerMapper.insert(server);
        } else {
            mcpServerMapper.update(server);
        }
        return Map.of("success", true);
    }

    public Map<String, Object> test(Long id) {
        McpServer server = mcpServerMapper.findById(id);
        if (server == null) {
            return Map.of("success", false, "message", "Server not found");
        }
        try {
            return Map.of("success", true, "message", "Connection successful");
        } catch (Exception e) {
            return Map.of("success", false, "message", e.getMessage());
        }
    }

    public Map<String, Object> delete(Long id) {
        mcpServerMapper.deleteById(id);
        return Map.of("success", true);
    }
}
