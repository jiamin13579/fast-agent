package com.fast.agent.service;

import com.fast.agent.entity.ModelTemplate;
import com.fast.agent.repository.ModelTemplateMapper;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ModelTemplateService {

    @Autowired
    private ModelTemplateMapper modelTemplateMapper;

    public List<ModelTemplate> list() {
        return modelTemplateMapper.selectList(null);
    }

    public ModelTemplate getById(Long id) {
        return modelTemplateMapper.selectById(id);
    }

    public void create(ModelTemplate template) {
        modelTemplateMapper.insert(template);
    }

    public void update(ModelTemplate template) {
        modelTemplateMapper.updateById(template);
    }

    public void delete(Long id) {
        modelTemplateMapper.deleteById(id);
    }
}
