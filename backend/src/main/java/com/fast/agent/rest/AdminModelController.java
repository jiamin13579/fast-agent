package com.fast.agent.rest;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fast.agent.config.NamespaceContext;
import com.fast.agent.entity.LlmModel;
import com.fast.agent.entity.UserNamespace;
import com.fast.agent.repository.UserNamespaceMapper;
import com.fast.agent.service.LlmModelService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/models")
public class AdminModelController {

    @Autowired
    private LlmModelService llmModelService;
    @Autowired
    private UserNamespaceMapper userNamespaceMapper;

    @GetMapping
    public List<LlmModel> list(@RequestParam(defaultValue = "0") Long namespaceId) {
        checkPermission(namespaceId);
        return llmModelService.listByNamespace(namespaceId);
    }

    @GetMapping("/{id}")
    public LlmModel get(@PathVariable Long id) {
        LlmModel model = llmModelService.getById(id);
        if (model == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        checkPermission(model.getNamespaceId());
        return model;
    }

    @PostMapping
    public void create(@RequestBody LlmModel model) {
        checkPermission(model.getNamespaceId());
        llmModelService.create(model);
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody LlmModel model) {
        LlmModel existing = llmModelService.getById(id);
        if (existing == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        checkPermission(existing.getNamespaceId());
        model.setId(id);
        llmModelService.update(model);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        LlmModel model = llmModelService.getById(id);
        if (model == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        checkPermission(model.getNamespaceId());
        llmModelService.delete(id);
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
