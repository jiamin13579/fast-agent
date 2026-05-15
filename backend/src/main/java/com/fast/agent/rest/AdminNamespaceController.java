package com.fast.agent.rest;

import com.fast.agent.config.NamespaceContext;
import com.fast.agent.entity.Namespace;
import com.fast.agent.service.NamespaceService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/namespaces")
public class AdminNamespaceController {

    @Autowired
    private NamespaceService namespaceService;

    @GetMapping
    public List<Namespace> list() {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return namespaceService.list();
    }

    @GetMapping("/{id}")
    public Namespace get(@PathVariable Long id) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return namespaceService.getById(id);
    }

    @PostMapping
    public void create(@RequestBody Namespace namespace) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespaceService.create(namespace);
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody Namespace namespace) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespace.setId(id);
        namespaceService.update(namespace);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespaceService.delete(id);
    }
}
