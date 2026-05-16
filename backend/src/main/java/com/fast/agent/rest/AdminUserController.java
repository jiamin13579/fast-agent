package com.fast.agent.rest;

import com.fast.agent.config.AdminContext;
import com.fast.agent.entity.User;
import com.fast.agent.service.UserService;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    @Autowired private UserService userService;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        if (!AdminContext.isGlobalAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        try {
            String email = (String) body.get("email");
            String phone = (String) body.get("phone");
            String nickname = (String) body.get("nickname");
            String password = (String) body.get("password");
            if (email == null || password == null || nickname == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "缺少必填字段"));
            }

            User user = userService.create(email, phone, nickname, password);
            return ResponseEntity.status(HttpStatus.CREATED).body(user);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id) {
        try {
            String newPassword = userService.resetPassword(id);
            return ResponseEntity.ok(Map.of("newPassword", newPassword));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
