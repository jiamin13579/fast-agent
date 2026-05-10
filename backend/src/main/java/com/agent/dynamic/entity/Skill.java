package com.agent.dynamic.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("agent_skill")
public class Skill {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String description;
    private String tools;
    private String config;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
