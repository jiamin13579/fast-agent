package com.agent.init;

import com.agent.entity.Role;
import com.agent.entity.User;
import com.agent.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.selectCount(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>()) > 0) {
            return; // 已有数据，跳过
        }

        String defaultPassword = passwordEncoder.encode("123456");

        User[] users = {
            createUser("superadmin@example.com", "superadmin", Role.SUPER_ADMIN),
            createUser("admin1@example.com", "管理员1", Role.ADMIN),
            createUser("admin2@example.com", "管理员2", Role.ADMIN),
            createUser("user1@example.com", "用户1", Role.USER),
            createUser("user2@example.com", "用户2", Role.USER),
            createUser("user3@example.com", "用户3", Role.USER)
        };

        for (User user : users) {
            user.setPassword(defaultPassword);
            user.setStatus(1);
            user.setMustChangePassword(true);
            userRepository.insert(user);
        }

        log.info("Initialized {} default users", users.length);
    }

    private User createUser(String email, String nickname, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setNickname(nickname);
        user.setRole(role);
        return user;
    }
}
