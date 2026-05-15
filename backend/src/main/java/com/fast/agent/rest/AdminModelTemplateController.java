package com.fast.agent.rest;

import com.fast.agent.config.NamespaceContext;
import com.fast.agent.entity.ModelTemplate;
import com.fast.agent.service.ModelTemplateService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/model-templates")
public class AdminModelTemplateController {

    @Autowired
    private ModelTemplateService modelTemplateService;

    @GetMapping
    public List<ModelTemplate> list() {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return modelTemplateService.list();
    }

    @GetMapping("/{id}")
    public ModelTemplate get(@PathVariable Long id) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return modelTemplateService.getById(id);
    }

    @PostMapping
    public void create(@RequestBody ModelTemplate template) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        modelTemplateService.create(template);
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody ModelTemplate template) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        template.setId(id);
        modelTemplateService.update(template);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        modelTemplateService.delete(id);
    }
}
