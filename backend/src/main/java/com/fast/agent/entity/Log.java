package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("log")
public class Log {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("task_id")
    private Long taskId;
    private String level;
    private String message;
    @TableField(exist = false)
    private String source;
    @TableField(exist = false)
    private String stackTrace;
    @TableField("created_at")
    private LocalDateTime createdAt;
}
