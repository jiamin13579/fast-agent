package com.fast.agent.repository;

import com.fast.agent.entity.ChatMessage;
import java.util.List;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface ChatMessageMapper {
    @Select("SELECT * FROM agent_message WHERE id = #{id}")
    ChatMessage findById(Long id);

    @Select("SELECT * FROM agent_message WHERE chat_id = #{chatId} ORDER BY created_at ASC")
    List<ChatMessage> findByChatId(Long chatId);

    @Select("SELECT * FROM agent_message ORDER BY created_at DESC")
    List<ChatMessage> findAll();

    @Insert(
            "INSERT INTO agent_message (chat_id, role, content) VALUES (#{chatId}, #{role}, #{content})")
    int insert(ChatMessage message);

    @Update(
            "UPDATE agent_message SET chat_id=#{chatId}, role=#{role}, content=#{content}, model=#{model}, "
                    + "audio_url=#{audioUrl}, image_urls=#{imageUrls}, tools=#{tools}, tool_results=#{toolResults} WHERE id=#{id}")
    int update(ChatMessage message);

    @Delete("DELETE FROM agent_message WHERE id = #{id}")
    int deleteById(Long id);

    @Delete("DELETE FROM agent_message WHERE chat_id = #{chatId}")
    int deleteByChatId(Long chatId);
}
