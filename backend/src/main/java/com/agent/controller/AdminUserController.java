package com.agent.controller;

import com.agent.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    @Autowired
    private UserService userService;

    @PostMapping("/{id}/reset-password")
    public Map<String, String> resetPassword(@PathVariable Long id) {
        try {
            String newPassword = userService.resetPassword(id);
            return Map.of("newPassword", newPassword);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(400, e.getMessage());
        }
    }
}