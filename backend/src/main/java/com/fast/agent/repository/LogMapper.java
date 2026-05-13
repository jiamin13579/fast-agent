package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.Log;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface LogMapper extends BaseMapper<Log> {

    default Log findById(Long id) {
        return selectById(id);
    }

    default List<Log> findByTaskId(Long taskId) {
        return selectList(
                Wrappers.<Log>lambdaQuery()
                        .eq(Log::getTaskId, taskId)
                        .orderByDesc(Log::getCreatedAt));
    }

    default List<Log> findAll() {
        return selectList(Wrappers.<Log>lambdaQuery().orderByDesc(Log::getCreatedAt));
    }
}
