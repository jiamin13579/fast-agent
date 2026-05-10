package com.agent.dynamic.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Chat {
    private Long id;
    private String sessionId;
    private String name;
    private String model;
    private String systemPrompt;
    private String tools;
    private String config;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}