package com.agent.dynamic.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("agent_mcp_server")
public class McpServer {
    @TableId(type = IdType.AUTO)
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
