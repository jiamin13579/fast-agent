package com.fast.agent.rest;

import com.fast.agent.config.AdminContext;
import com.fast.agent.entity.Namespace;
import com.fast.agent.entity.User;
import com.fast.agent.repository.UserMapper;
import com.fast.agent.service.NamespaceService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/namespaces")
public class AdminNamespaceController {

    @Autowired
    private NamespaceService namespaceService;

    @Autowired
    private UserMapper userMapper;

    @GetMapping
    public List<Namespace> list() {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return namespaceService.list();
    }

    @GetMapping("/{id}")
    public Namespace get(@PathVariable Long id) {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return namespaceService.getById(id);
    }

    @PostMapping
    public void create(@RequestBody Namespace namespace) {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespaceService.create(namespace);
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody Namespace namespace) {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespace.setId(id);
        namespaceService.update(namespace);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespaceService.delete(id);
    }

    @GetMapping("/{id}/users")
    public List<Map<String, Object>> getNamespaceUsers(@PathVariable Long id) {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        List<User> users = userMapper.selectList(null);
        return users.stream().map(u -> Map.<String, Object>of(
            "userId", u.getId(),
            "nickname", u.getNickname(),
            "email", u.getEmail()
        )).toList();
    }
}
