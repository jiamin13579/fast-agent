package com.fast.agent.service;

import com.fast.agent.entity.User;
import com.fast.agent.repository.UserMapper;
import com.fast.agent.util.JwtUtil;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired private UserMapper userRepository;

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

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put(
                "user",
                Map.of(
                        "id", user.getId(),
                        "email", user.getEmail(),
                        "nickname", user.getNickname(),
                        "role", user.getRole().name(),
                        "mustChangePassword", user.getMustChangePassword()));

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
}
