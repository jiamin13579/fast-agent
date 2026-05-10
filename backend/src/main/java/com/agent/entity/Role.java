package com.agent.entity;

import com.baomidou.mybatisplus.annotation.EnumValue;

public enum Role {
    @EnumValue
    SUPER_ADMIN,
    @EnumValue
    ADMIN,
    @EnumValue
    USER
}
