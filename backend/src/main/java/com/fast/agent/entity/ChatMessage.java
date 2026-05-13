package com.fast.agent.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ChatMessage {
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
