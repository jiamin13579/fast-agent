package com.fast.agent.service;

import com.fast.agent.entity.Namespace;
import com.fast.agent.repository.NamespaceMapper;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class NamespaceService {

    @Autowired
    private NamespaceMapper namespaceMapper;

    public List<Namespace> list() {
        return namespaceMapper.selectList(null);
    }

    public Namespace getById(Long id) {
        return namespaceMapper.selectById(id);
    }

    public void create(Namespace namespace) {
        namespaceMapper.insert(namespace);
    }

    public void update(Namespace namespace) {
        namespaceMapper.updateById(namespace);
    }

    public void delete(Long id) {
        namespaceMapper.deleteById(id);
    }
}
