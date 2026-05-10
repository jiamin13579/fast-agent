package com.agent.dynamic.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("agent_knowledge_source")
public class KnowledgeSource {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String type;
    private String config;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
