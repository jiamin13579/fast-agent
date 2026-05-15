package com.fast.agent.init;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenPassword implements CommandLineRunner {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println("123456 => " + encoder.encode("123456"));
    }
    
    @Override
    public void run(String... args) {
        main(args);
    }
}
