package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("chat_message")
public class ChatMessage {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("conversation_id")
    private Long conversationId;
    private String role;
    private String content;
    private String model;
    @TableField("audio_url")
    private String audioUrl;
    @TableField("image_urls")
    private String imageUrls;
    private String tools;
    @TableField("tool_results")
    private String toolResults;
    @TableField("created_at")
    private LocalDateTime createdAt;
}
