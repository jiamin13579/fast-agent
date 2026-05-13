package com.fast.agent.repository;

import com.fast.agent.entity.ScheduledTask;
import java.util.List;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface ScheduledTaskMapper {
    @Select("SELECT * FROM agent_scheduled_task WHERE id = #{id}")
    ScheduledTask findById(Long id);

    @Select("SELECT * FROM agent_scheduled_task ORDER BY created_at DESC")
    List<ScheduledTask> findAll();

    @Select("SELECT * FROM agent_scheduled_task WHERE enabled = true")
    List<ScheduledTask> findEnabled();

    @Insert(
            "INSERT INTO agent_scheduled_task (name, cron, prompt, webhook_url, enabled, durable, skill_id, params, last_run, created_at, updated_at) "
                    + "VALUES (#{name}, #{cron}, #{prompt}, #{webhookUrl}, #{enabled}, #{durable}, #{skillId}, #{params}, #{lastRun}, #{createdAt}, #{updatedAt})")
    int insert(ScheduledTask scheduledTask);

    @Update(
            "UPDATE agent_scheduled_task SET name=#{name}, cron=#{cron}, prompt=#{prompt}, webhook_url=#{webhookUrl}, "
                    + "enabled=#{enabled}, durable=#{durable}, skill_id=#{skillId}, params=#{params}, last_run=#{lastRun}, updated_at=#{updatedAt} WHERE id=#{id}")
    int update(ScheduledTask scheduledTask);

    @Delete("DELETE FROM agent_scheduled_task WHERE id = #{id}")
    int deleteById(Long id);
}
