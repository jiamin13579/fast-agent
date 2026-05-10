package com.agent.dynamic.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Skill {
    private Long id;
    private String name;
    private String description;
    private String tools;
    private String config;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}