package com.fast.agent.repository;

import com.fast.agent.entity.Log;
import java.util.List;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface LogMapper {
    @Select("SELECT * FROM agent_log WHERE id = #{id}")
    Log findById(Long id);

    @Select("SELECT * FROM agent_log WHERE task_id = #{taskId} ORDER BY created_at DESC")
    List<Log> findByTaskId(Long taskId);

    @Select("SELECT * FROM agent_log ORDER BY created_at DESC")
    List<Log> findAll();

    @Insert(
            "INSERT INTO agent_log (task_id, level, message, source, stack_trace, created_at) "
                    + "VALUES (#{taskId}, #{level}, #{message}, #{source}, #{stackTrace}, #{createdAt})")
    int insert(Log log);

    @Delete("DELETE FROM agent_log WHERE id = #{id}")
    int deleteById(Long id);
}
