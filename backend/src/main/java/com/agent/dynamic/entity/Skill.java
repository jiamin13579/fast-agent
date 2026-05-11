package com.agent.dynamic.entity;

import java.time.LocalDateTime;
import lombok.Data;

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
