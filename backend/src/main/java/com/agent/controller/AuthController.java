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
        try {
            String email = body.get("email");
            String password = body.get("password");
            return authService.login(email, password);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(401, e.getMessage());
        }
    }

    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader("Authorization") String authHeader) {
        try {
            User user = authService.getCurrentUser(authHeader);
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
