package com.agent.dynamic.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Log {
    private Long id;
    private Long taskId;
    private String level;
    private String message;
    private String source;
    private String stackTrace;
    private LocalDateTime createdAt;
}