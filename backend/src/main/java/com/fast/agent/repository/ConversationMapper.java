package com.fast.agent.repository;

import com.fast.agent.entity.Conversation;
import java.util.List;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface ConversationMapper {
    @Select("SELECT * FROM agent_chat WHERE id = #{id}")
    Conversation findById(Long id);

    @Select("SELECT * FROM agent_chat ORDER BY created_at DESC")
    List<Conversation> findAll();

    @Insert("INSERT INTO agent_chat (name) VALUES (#{name})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Conversation chat);

    @Update(
            "UPDATE agent_chat SET session_id=#{sessionId}, name=#{name}, model=#{model}, "
                    + "system_prompt=#{systemPrompt}, tools=#{tools}, config=#{config}, updated_at=#{updatedAt} WHERE id=#{id}")
    int update(Conversation chat);

    @Delete("DELETE FROM agent_chat WHERE id = #{id}")
    int deleteById(Long id);
}
