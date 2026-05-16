package com.fast.agent.service;

import com.fast.agent.entity.Admin;
import com.fast.agent.repository.AdminMapper;
import com.fast.agent.repository.AdminNamespaceMapper;
import com.fast.agent.util.AdminJwtUtil;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthService {

    @Autowired private AdminMapper adminRepository;
    @Autowired private AdminNamespaceMapper adminNamespaceMapper;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AdminJwtUtil adminJwtUtil;

    public Map<String, Object> login(String username, String password) {
        Admin admin = adminRepository.findByUsername(username).orElse(null);
        if (admin == null || !passwordEncoder.matches(password, admin.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }
        if (admin.getStatus() == null || admin.getStatus() == 0) {
            throw new RuntimeException("账号已被禁用");
        }

        String token = adminJwtUtil.generateToken(admin.getId(), admin.getUsername(), admin.getIsGlobalAdmin());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("admin", buildAdminMap(admin));
        result.put("namespaces", getNamespaces(admin));
        return result;
    }

    public Admin getCurrentAdmin(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("未登录");
        }
        String jwt = authHeader.substring(7);
        if (!adminJwtUtil.validateToken(jwt)) {
            throw new RuntimeException("token 已过期");
        }
        Long adminId = Long.parseLong(adminJwtUtil.parseToken(jwt).getSubject());
        return adminRepository.selectById(adminId);
    }

    private Map<String, Object> buildAdminMap(Admin admin) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", admin.getId());
        map.put("username", admin.getUsername());
        map.put("nickname", admin.getNickname());
        map.put("isGlobalAdmin", admin.getIsGlobalAdmin());
        return map;
    }

    private List<Map<String, Object>> getNamespaces(Admin admin) {
        if (Boolean.TRUE.equals(admin.getIsGlobalAdmin())) {
            return List.of();
        }
        return adminNamespaceMapper.findByAdminId(admin.getId()).stream()
                .map(an -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", an.getNamespaceId());
                    map.put("role", an.getRole());
                    return map;
                })
                .collect(Collectors.toList());
    }
}
