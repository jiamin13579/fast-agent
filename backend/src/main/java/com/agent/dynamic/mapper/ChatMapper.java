package com.agent.dynamic.mapper;

import com.agent.dynamic.entity.Chat;
import java.util.List;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface ChatMapper {
    @Select("SELECT * FROM agent_chat WHERE id = #{id}")
    Chat findById(Long id);

    @Select("SELECT * FROM agent_chat ORDER BY created_at DESC")
    List<Chat> findAll();

    @Insert("INSERT INTO agent_chat (name) VALUES (#{name})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Chat chat);

    @Update(
            "UPDATE agent_chat SET session_id=#{sessionId}, name=#{name}, model=#{model}, "
                    + "system_prompt=#{systemPrompt}, tools=#{tools}, config=#{config}, updated_at=#{updatedAt} WHERE id=#{id}")
    int update(Chat chat);

    @Delete("DELETE FROM agent_chat WHERE id = #{id}")
    int deleteById(Long id);
}
