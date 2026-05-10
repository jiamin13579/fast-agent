package com.agent.controller;

import com.agent.entity.User;
import com.agent.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(400, "邮箱和密码不能为空");
        }

        try {
            return authService.login(email, password);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(401, e.getMessage());
        }
    }

    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader("Authorization") String authHeader) {
        try {
            User user = authService.getCurrentUser(authHeader);
            if (user.getRole() == null) {
                throw new ResponseStatusException(500, "用户角色未设置");
            }
            return Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "nickname", user.getNickname(),
                "role", user.getRole().name()
            );
        } catch (RuntimeException e) {
            throw new ResponseStatusException(401, e.getMessage());
        }
    }
}
