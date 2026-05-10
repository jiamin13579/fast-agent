package com.agent.dynamic.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("agent_message")
public class Message {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long chatId;
    private String role;
    private String content;
    private String model;
    private String audioUrl;
    private String imageUrls;
    private String tools;
    private String toolResults;
    private LocalDateTime createdAt;
}
