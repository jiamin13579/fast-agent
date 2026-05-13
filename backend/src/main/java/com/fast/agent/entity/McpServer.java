package com.fast.agent.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class McpServer {
    private Long id;
    private String name;
    private String description;
    private String host;
    private Integer port;
    private String transportType;
    private String config;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
