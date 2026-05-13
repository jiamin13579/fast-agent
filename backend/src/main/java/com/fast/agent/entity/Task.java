package com.fast.agent.entity;

import java.time.LocalDateTime;
import lombok.Data;

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
