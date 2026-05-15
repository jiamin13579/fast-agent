package com.fast.agent.service;

import com.fast.agent.entity.User;
import com.fast.agent.entity.UserNamespace;
import com.fast.agent.repository.UserMapper;
import com.fast.agent.repository.UserNamespaceMapper;
import com.fast.agent.util.JwtUtil;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired private UserMapper userRepository;
    @Autowired private UserNamespaceMapper userNamespaceMapper;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;

    public Map<String, Object> login(String email, String password) {
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("邮箱或密码错误");
        }

        if (user.getStatus() == null || user.getStatus() == 0) {
            throw new RuntimeException("账号已被禁用");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getIsAdmin());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", buildUserMap(user));
        result.put("namespaces", getNamespaces(user));

        return result;
    }

    public Map<String, Object> me(User user) {
        Map<String, Object> result = new HashMap<>();
        result.put("user", buildUserMap(user));
        result.put("namespaces", getNamespaces(user));
        return result;
    }

    public User getCurrentUser(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new RuntimeException("未登录");
        }

        String jwt = token.substring(7);
        if (!jwtUtil.validateToken(jwt)) {
            throw new RuntimeException("token 已过期");
        }

        Long userId = Long.parseLong(jwtUtil.parseToken(jwt).getSubject());
        return userRepository.findById(userId).orElse(null);
    }

    private Map<String, Object> buildUserMap(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("email", user.getEmail());
        map.put("nickname", user.getNickname());
        map.put("isAdmin", user.getIsAdmin());
        map.put("mustChangePassword", user.getMustChangePassword());
        return map;
    }

    private List<Map<String, Object>> getNamespaces(User user) {
        if (Boolean.TRUE.equals(user.getIsAdmin())) {
            return List.of();
        }
        return userNamespaceMapper.selectList(null).stream()
                .filter(un -> un.getUserId().equals(user.getId()))
                .map(un -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", un.getNamespaceId());
                    map.put("role", un.getRole());
                    return map;
                })
                .collect(Collectors.toList());
    }
}
