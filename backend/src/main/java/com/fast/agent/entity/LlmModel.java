package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("llm_model")
public class LlmModel {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("namespace_id")
    private Long namespaceId;
    private String name;
    private String provider;
    @TableField("model_name")
    private String modelName;
    @TableField("api_key")
    private String apiKey;
    @TableField("base_url")
    private String baseUrl;
    @TableField("max_tokens")
    private Integer maxTokens;
    private BigDecimal temperature;
    private Integer status;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
