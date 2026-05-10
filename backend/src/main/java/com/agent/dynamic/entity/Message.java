package com.agent.dynamic.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Message {
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