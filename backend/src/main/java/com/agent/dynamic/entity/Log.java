package com.agent.dynamic.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("agent_log")
public class Log {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String level;
    private String message;
    private String source;
    private String stackTrace;
    private LocalDateTime createdAt;
}
