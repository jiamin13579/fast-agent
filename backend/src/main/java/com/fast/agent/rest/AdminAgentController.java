package com.fast.agent.rest;

import com.fast.agent.config.AdminContext;
import com.fast.agent.entity.AdminNamespace;
import com.fast.agent.entity.Agent;
import com.fast.agent.entity.AgentResource;
import com.fast.agent.repository.AdminNamespaceMapper;
import com.fast.agent.service.AgentService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/agents")
public class AdminAgentController {

    @Autowired
    private AgentService agentService;
    @Autowired
    private AdminNamespaceMapper adminNamespaceMapper;

    @GetMapping
    public List<Agent> list(@RequestParam(defaultValue = "0") Long namespaceId) {
        checkPermission(namespaceId);
        return agentService.listByNamespace(namespaceId);
    }

    @GetMapping("/{id}")
    public Agent get(@PathVariable Long id) {
        Agent agent = agentService.getById(id);
        if (agent == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        checkPermission(agent.getNamespaceId());
        return agent;
    }

    @PostMapping
    public void create(@RequestBody Agent agent) {
        checkPermission(agent.getNamespaceId());
        agent.setCreatedBy(AdminContext.getAdminId());
        agentService.create(agent);
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody Agent agent) {
        Agent existing = agentService.getById(id);
        if (existing == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        checkPermission(existing.getNamespaceId());
        agent.setId(id);
        agentService.update(agent);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        Agent agent = agentService.getById(id);
        if (agent == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        checkPermission(agent.getNamespaceId());
        agentService.delete(id);
    }

    @PostMapping("/{id}/resources")
    public void bindResource(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Agent agent = agentService.getById(id);
        if (agent == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        checkPermission(agent.getNamespaceId());

        AgentResource resource = new AgentResource();
        resource.setAgentId(id);
        resource.setResourceType((String) body.get("resource_type"));
        resource.setResourceId(((Number) body.get("resource_id")).longValue());
        agentService.bindResource(resource);
    }

    @DeleteMapping("/{id}/resources/{resourceId}")
    public void unbindResource(
            @PathVariable Long id,
            @PathVariable Long resourceId,
            @RequestParam String type) {
        Agent agent = agentService.getById(id);
        if (agent == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        checkPermission(agent.getNamespaceId());
        agentService.unbindResource(id, resourceId, type);
    }

    private void checkPermission(Long namespaceId) {
        if (AdminContext.isGlobalAdmin()) return;
        if (namespaceId == 0L) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Long adminId = AdminContext.getAdminId();
        if (adminNamespaceMapper.countAdminRole(adminId, namespaceId) == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }
}
