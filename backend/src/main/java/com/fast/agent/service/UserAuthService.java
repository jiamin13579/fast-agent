package com.fast.agent.service;

import com.fast.agent.entity.User;
import com.fast.agent.repository.UserMapper;
import com.fast.agent.util.UserJwtUtil;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserAuthService {

    @Autowired private UserMapper userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private UserJwtUtil userJwtUtil;

    public Map<String, Object> login(String email, String password) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("邮箱或密码错误");
        }
        if (user.getStatus() == null || user.getStatus() == 0) {
            throw new RuntimeException("账号已被禁用");
        }

        String token = userJwtUtil.generateToken(user.getId(), user.getEmail());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", buildUserMap(user));
        return result;
    }

    public User getCurrentUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("未登录");
        }
        String jwt = authHeader.substring(7);
        if (!userJwtUtil.validateToken(jwt)) {
            throw new RuntimeException("token 已过期");
        }
        Long userId = Long.parseLong(userJwtUtil.parseToken(jwt).getSubject());
        return userRepository.findById(userId).orElse(null);
    }

    private Map<String, Object> buildUserMap(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("email", user.getEmail());
        map.put("nickname", user.getNickname());
        return map;
    }
}
