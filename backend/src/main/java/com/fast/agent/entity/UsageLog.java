package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("usage_log")
public class UsageLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("user_id")
    private Long userId;
    @TableField("namespace_id")
    private Long namespaceId;
    @TableField("agent_id")
    private Long agentId;
    @TableField("model_id")
    private Long modelId;
    @TableField("conversation_id")
    private String conversationId;
    @TableField("input_tokens")
    private Integer inputTokens;
    @TableField("output_tokens")
    private Integer outputTokens;
    @TableField("duration_ms")
    private Integer durationMs;
    private BigDecimal cost;
    @TableField("created_at")
    private LocalDateTime createdAt;
}
