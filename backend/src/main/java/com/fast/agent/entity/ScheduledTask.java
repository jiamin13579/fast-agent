package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("scheduled_task")
public class ScheduledTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String cron;
    @TableField(exist = false)
    private String prompt;
    @TableField(exist = false)
    private String webhookUrl;
    private Boolean enabled;
    @TableField(exist = false)
    private Boolean durable;
    @TableField("skill_id")
    private Long skillId;
    private String params;
    @TableField("last_run")
    private java.sql.Timestamp lastRun;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
