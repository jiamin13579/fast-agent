package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("mcp_server")
public class McpServer {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    @TableField(exist = false)
    private String description;
    @TableField(exist = false)
    private String host;
    @TableField(exist = false)
    private Integer port;
    @TableField(exist = false)
    private String transportType;
    @TableField(exist = false)
    private String config;
    private String url;
    @TableField("auth_type")
    private String authType;
    @TableField("auth_token")
    private String authToken;
    @TableField("last_test")
    private LocalDateTime lastTest;
    private Boolean enabled;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
