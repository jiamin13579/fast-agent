package com.agent.dynamic.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("agent_chat")
public class Chat {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String sessionId;
    private String name;
    private String model;
    private String systemPrompt;
    private String tools;
    private String config;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
