package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("agent")
public class Agent {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("namespace_id")
    private Long namespaceId;
    private String name;
    private String description;
    @TableField("system_prompt")
    private String systemPrompt;
    private String avatar;
    private Integer status;
    private Integer version;
    @TableField("created_by")
    private Long createdBy;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
