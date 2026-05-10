package com.agent.dynamic.mapper;

import com.agent.dynamic.entity.Skill;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Delete;
import java.util.List;

@Mapper
public interface SkillMapper {
    @Select("SELECT * FROM agent_skill WHERE id = #{id}")
    Skill findById(Long id);

    @Select("SELECT * FROM agent_skill ORDER BY created_at DESC")
    List<Skill> findAll();

    @Select("SELECT * FROM agent_skill WHERE enabled = true ORDER BY created_at DESC")
    List<Skill> findEnabled();

    @Insert("INSERT INTO agent_skill (name, description, tools, config, enabled, created_at, updated_at) " +
            "VALUES (#{name}, #{description}, #{tools}, #{config}, #{enabled}, #{createdAt}, #{updatedAt})")
    int insert(Skill skill);

    @Update("UPDATE agent_skill SET name=#{name}, description=#{description}, tools=#{tools}, config=#{config}, " +
            "enabled=#{enabled}, updated_at=#{updatedAt} WHERE id=#{id}")
    int update(Skill skill);

    @Delete("DELETE FROM agent_skill WHERE id = #{id}")
    int deleteById(Long id);
}