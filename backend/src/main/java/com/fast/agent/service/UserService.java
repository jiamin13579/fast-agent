package com.fast.agent.service;

import com.fast.agent.entity.User;
import com.fast.agent.repository.UserMapper;
import java.security.SecureRandom;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired private UserMapper userRepository;

    @Autowired private PasswordEncoder passwordEncoder;

    public User create(String email, String phone, String nickname, String password) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("邮箱已被使用");
        }
        User user = new User();
        user.setEmail(email);
        user.setPhone(phone);
        user.setNickname(nickname);
        user.setPassword(passwordEncoder.encode(password));
        user.setStatus(1);
        userRepository.insert(user);
        return user;
    }

    public String resetPassword(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        String newPassword = generateRandomPassword(8);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(true);
        userRepository.update(user);

        return newPassword;
    }

    private String generateRandomPassword(int length) {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
