package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("agent_resource")
public class AgentResource {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("agent_id")
    private Long agentId;
    @TableField("resource_type")
    private String resourceType;
    @TableField("resource_id")
    private Long resourceId;
    @TableField("created_at")
    private LocalDateTime createdAt;
}
