package com.agent.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_user")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String email;
    private String phone;
    private String nickname;
    private String password;
    private Role role;
    private Integer status; // 1=ENABLED, 0=DISABLED
    @TableField("must_change_password")
    private Boolean mustChangePassword;

    @TableField("create_time")
    private LocalDateTime createTime;

    @TableField("update_time")
    private LocalDateTime updateTime;
}
