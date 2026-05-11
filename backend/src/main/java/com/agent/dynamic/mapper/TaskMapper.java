package com.agent.dynamic.mapper;

import com.agent.dynamic.entity.Task;
import java.util.List;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface TaskMapper {
    @Select("SELECT * FROM agent_task WHERE id = #{id}")
    Task findById(Long id);

    @Select("SELECT * FROM agent_task ORDER BY created_at DESC")
    List<Task> findAll();

    @Select("SELECT * FROM agent_task WHERE status = #{status} ORDER BY created_at DESC")
    List<Task> findByStatus(String status);

    @Insert(
            "INSERT INTO agent_task (name, description, status, result, error, skill_id, params, error_msg, created_at, updated_at) "
                    + "VALUES (#{name}, #{description}, #{status}, #{result}, #{error}, #{skillId}, #{params}, #{errorMsg}, #{createdAt}, #{updatedAt})")
    int insert(Task task);

    @Update(
            "UPDATE agent_task SET name=#{name}, description=#{description}, status=#{status}, result=#{result}, "
                    + "error=#{error}, skill_id=#{skillId}, params=#{params}, error_msg=#{errorMsg}, updated_at=#{updatedAt} WHERE id=#{id}")
    int update(Task task);

    @Delete("DELETE FROM agent_task WHERE id = #{id}")
    int deleteById(Long id);
}
