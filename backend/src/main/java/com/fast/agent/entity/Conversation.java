package com.fast.agent.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class Conversation {
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
