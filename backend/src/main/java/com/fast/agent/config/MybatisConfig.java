package com.fast.agent.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("com.fast.agent.repository")
public class MybatisConfig {
}
