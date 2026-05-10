package com.agent.dynamic.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Task {
    private Long id;
    private String name;
    private String description;
    private String status;
    private String result;
    private String error;
    private Long skillId;
    private String params;
    private String errorMsg;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}