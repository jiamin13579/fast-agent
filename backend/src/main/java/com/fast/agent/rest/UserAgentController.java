package com.fast.agent.rest;

import com.fast.agent.entity.Agent;
import com.fast.agent.entity.AgentResource;
import com.fast.agent.service.AgentService;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agents")
public class UserAgentController {

    @Autowired
    private AgentService agentService;

    @GetMapping
    public List<Agent> list(@RequestParam Long namespaceId) {
        return agentService.listByNamespace(namespaceId);
    }

    @GetMapping("/{id}")
    public Agent get(@PathVariable Long id) {
        return agentService.getById(id);
    }

    @GetMapping("/{id}/resources")
    public List<AgentResource> getResources(
            @PathVariable Long id,
            @RequestParam(required = false) String type) {
        List<AgentResource> all = agentService.getResources(id);
        if (type != null) {
            return all.stream()
                    .filter(r -> r.getResourceType().equals(type))
                    .collect(Collectors.toList());
        }
        return all;
    }
}
