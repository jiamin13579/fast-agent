package com.agent.dynamic.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.agent.dynamic.entity.Message;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MessageMapper extends BaseMapper<Message> {
}
