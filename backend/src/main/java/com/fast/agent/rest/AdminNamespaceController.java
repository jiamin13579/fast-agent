package com.fast.agent.rest;

import com.fast.agent.config.NamespaceContext;
import com.fast.agent.entity.Namespace;
import com.fast.agent.entity.UserNamespace;
import com.fast.agent.repository.UserNamespaceMapper;
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
    private UserNamespaceMapper userNamespaceMapper;

    @Autowired
    private UserMapper userMapper;

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

    @GetMapping("/{id}/users")
    public List<Map<String, Object>> getNamespaceUsers(@PathVariable Long id) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        List<UserNamespace> userNamespaces = userNamespaceMapper.findByNamespaceId(id);
        return userNamespaces.stream().map(un -> {
            var userOpt = userMapper.findById(un.getUserId());
            String nickname = userOpt.map(u -> u.getNickname()).orElse("未知");
            String email = userOpt.map(u -> u.getEmail()).orElse("");
            return Map.<String, Object>of(
                "userId", un.getUserId(),
                "role", un.getRole(),
                "nickname", nickname,
                "email", email
            );
        }).toList();
    }

    @PutMapping("/{id}/users/{userId}")
    public void updateUserRole(@PathVariable Long id, @PathVariable Long userId, @RequestBody Map<String, String> body) {
        if (!NamespaceContext.getIsAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        String role = body.get("role");
        if (!"ADMIN".equals(role) && !"USER".equals(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        UserNamespace un = userNamespaceMapper.findByUserIdAndNamespaceId(userId, id);
        if (un == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        un.setRole(role);
        userNamespaceMapper.updateById(un);
    }
}
