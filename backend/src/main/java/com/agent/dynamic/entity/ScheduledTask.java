package com.agent.dynamic.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("agent_scheduled_task")
public class ScheduledTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String cron;
    private String prompt;
    private String webhookUrl;
    private Boolean enabled;
    private Boolean durable;
    private Long skillId;
    private String params;
    private java.sql.Timestamp lastRun;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
