package com.agent.dynamic.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.agent.dynamic.entity.Chat;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ChatMapper extends BaseMapper<Chat> {
}
