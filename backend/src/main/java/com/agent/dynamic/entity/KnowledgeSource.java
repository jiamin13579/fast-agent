package com.agent.dynamic.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class KnowledgeSource {
    private Long id;
    private String name;
    private String type;
    private String config;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
