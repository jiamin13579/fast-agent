package com.fast.agent.init;

import com.fast.agent.entity.User;
import com.fast.agent.repository.AdminMapper;
import com.fast.agent.repository.UserMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired private UserMapper userRepository;
    @Autowired private AdminMapper adminRepository;

    @Override
    @Transactional
    public void run(String... args) {
        boolean hasUsers = !userRepository.selectList(null).isEmpty();
        boolean hasAdmins = !adminRepository.selectList(null).isEmpty();
        if (hasUsers || hasAdmins) {
            log.info("Data already exists, skipping initialization");
            return;
        }
        log.info("No data found — schema.sql should handle initial data");
    }
}
