package com.agent.dynamic.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.agent.dynamic.entity.ScheduledTask;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ScheduledTaskMapper extends BaseMapper<ScheduledTask> {
}
