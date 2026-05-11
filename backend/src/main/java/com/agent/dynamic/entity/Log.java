package com.agent.dynamic.entity;

import java.time.LocalDateTime;
import lombok.Data;

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
