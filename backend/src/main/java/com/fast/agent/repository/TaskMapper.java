package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.Task;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TaskMapper extends BaseMapper<Task> {

    default Task findById(Long id) {
        return selectById(id);
    }

    default List<Task> findAll() {
        return selectList(Wrappers.<Task>lambdaQuery().orderByDesc(Task::getCreatedAt));
    }

    default List<Task> findByStatus(String status) {
        return selectList(
                Wrappers.<Task>lambdaQuery()
                        .eq(Task::getStatus, status)
                        .orderByDesc(Task::getCreatedAt));
    }

    default int update(Task task) {
        return updateById(task);
    }
}
