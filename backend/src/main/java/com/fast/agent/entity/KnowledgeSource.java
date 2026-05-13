package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("knowledge_source")
public class KnowledgeSource {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String type;
    @TableField(exist = false)
    private String config;
    private String path;
    private String url;
    @TableField("sync_interval")
    private Integer syncInterval;
    private Boolean enabled;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
