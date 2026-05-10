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
    private Boolean mustChangePassword;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
