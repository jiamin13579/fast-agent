package com.fast.agent.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fast.agent.entity.Agent;
import com.fast.agent.entity.AgentResource;
import com.fast.agent.repository.AgentMapper;
import com.fast.agent.repository.AgentResourceMapper;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AgentService {

    @Autowired
    private AgentMapper agentMapper;
    @Autowired
    private AgentResourceMapper agentResourceMapper;

    public List<Agent> listByNamespace(Long namespaceId) {
        LambdaQueryWrapper<Agent> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Agent::getNamespaceId, namespaceId)
               .or().eq(Agent::getNamespaceId, 0L);
        return agentMapper.selectList(wrapper);
    }

    public Agent getById(Long id) {
        return agentMapper.selectById(id);
    }

    @Transactional
    public void create(Agent agent) {
        agentMapper.insert(agent);
    }

    public void update(Agent agent) {
        agentMapper.updateById(agent);
    }

    public void delete(Long id) {
        agentMapper.deleteById(id);
    }

    public List<AgentResource> getResources(Long agentId) {
        LambdaQueryWrapper<AgentResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentResource::getAgentId, agentId);
        return agentResourceMapper.selectList(wrapper);
    }

    public void bindResource(AgentResource resource) {
        agentResourceMapper.insert(resource);
    }

    public void unbindResource(Long agentId, Long resourceId, String type) {
        LambdaQueryWrapper<AgentResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentResource::getAgentId, agentId)
               .eq(AgentResource::getResourceId, resourceId)
               .eq(AgentResource::getResourceType, type);
        agentResourceMapper.delete(wrapper);
    }
}
