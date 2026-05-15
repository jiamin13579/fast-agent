package com.fast.agent.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fast.agent.entity.LlmModel;
import com.fast.agent.repository.LlmModelMapper;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class LlmModelService {

    @Autowired
    private LlmModelMapper llmModelMapper;

    public List<LlmModel> listByNamespace(Long namespaceId) {
        LambdaQueryWrapper<LlmModel> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LlmModel::getNamespaceId, namespaceId)
               .or().eq(LlmModel::getNamespaceId, 0L);
        return llmModelMapper.selectList(wrapper);
    }

    public LlmModel getById(Long id) {
        return llmModelMapper.selectById(id);
    }

    public void create(LlmModel model) {
        llmModelMapper.insert(model);
    }

    public void update(LlmModel model) {
        llmModelMapper.updateById(model);
    }

    public void delete(Long id) {
        llmModelMapper.deleteById(id);
    }
}
