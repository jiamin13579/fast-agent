package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.ScheduledTask;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ScheduledTaskMapper extends BaseMapper<ScheduledTask> {

    default ScheduledTask findById(Long id) {
        return selectById(id);
    }

    default List<ScheduledTask> findAll() {
        return selectList(
                Wrappers.<ScheduledTask>lambdaQuery()
                        .orderByDesc(ScheduledTask::getCreatedAt));
    }

    default List<ScheduledTask> findEnabled() {
        return selectList(Wrappers.<ScheduledTask>lambdaQuery().eq(ScheduledTask::getEnabled, true));
    }

    default int update(ScheduledTask scheduledTask) {
        return updateById(scheduledTask);
    }
}
