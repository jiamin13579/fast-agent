package com.agent.dynamic.mapper;

import com.agent.dynamic.entity.KnowledgeSource;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Delete;
import java.util.List;

@Mapper
public interface KnowledgeSourceMapper {
    @Select("SELECT * FROM agent_knowledge_source WHERE id = #{id}")
    KnowledgeSource findById(Long id);

    @Select("SELECT * FROM agent_knowledge_source ORDER BY created_at DESC")
    List<KnowledgeSource> findAll();

    @Select("SELECT * FROM agent_knowledge_source WHERE enabled = true ORDER BY created_at DESC")
    List<KnowledgeSource> findEnabled();

    @Insert("INSERT INTO agent_knowledge_source (name, type, config, enabled, created_at, updated_at) " +
            "VALUES (#{name}, #{type}, #{config}, #{enabled}, #{createdAt}, #{updatedAt})")
    int insert(KnowledgeSource knowledgeSource);

    @Update("UPDATE agent_knowledge_source SET name=#{name}, type=#{type}, config=#{config}, enabled=#{enabled}, " +
            "updated_at=#{updatedAt} WHERE id=#{id}")
    int update(KnowledgeSource knowledgeSource);

    @Delete("DELETE FROM agent_knowledge_source WHERE id = #{id}")
    int deleteById(Long id);
}