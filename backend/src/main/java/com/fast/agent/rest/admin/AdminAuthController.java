package com.fast.agent.rest.admin;

import com.fast.agent.entity.Admin;
import com.fast.agent.service.AdminAuthService;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {

    @Autowired private AdminAuthService adminAuthService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户名和密码不能为空"));
        }
        try {
            return ResponseEntity.ok(adminAuthService.login(username, password));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        try {
            Admin admin = adminAuthService.getCurrentAdmin(authHeader);
            Map<String, Object> result = new java.util.HashMap<>();
            result.put("id", admin.getId());
            result.put("username", admin.getUsername());
            result.put("nickname", admin.getNickname());
            result.put("isGlobalAdmin", admin.getIsGlobalAdmin());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
