package com.fast.agent.rest;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fast.agent.config.NamespaceContext;
import com.fast.agent.entity.Agent;
import com.fast.agent.entity.AgentResource;
import com.fast.agent.entity.UserNamespace;
import com.fast.agent.repository.UserNamespaceMapper;
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
    private UserNamespaceMapper userNamespaceMapper;

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
        agent.setCreatedBy(NamespaceContext.getUserId());
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
        if (NamespaceContext.getIsAdmin()) return;
        if (namespaceId == 0L) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Long userId = NamespaceContext.getUserId();
        LambdaQueryWrapper<UserNamespace> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserNamespace::getUserId, userId)
               .eq(UserNamespace::getNamespaceId, namespaceId)
               .eq(UserNamespace::getRole, "ADMIN");
        if (userNamespaceMapper.selectCount(wrapper) == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }
}
