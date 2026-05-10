package com.agent.init;

import com.agent.entity.Role;
import com.agent.entity.User;
import com.agent.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.selectCount(null) > 0) {
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

        System.out.println("Initialized " + users.length + " default users");
    }

    private User createUser(String email, String nickname, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setNickname(nickname);
        user.setRole(role);
        return user;
    }
}
