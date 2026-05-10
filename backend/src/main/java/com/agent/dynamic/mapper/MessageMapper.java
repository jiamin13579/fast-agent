package com.agent.dynamic.mapper;

import com.agent.dynamic.entity.Message;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Delete;
import java.util.List;

@Mapper
public interface MessageMapper {
    @Select("SELECT * FROM agent_message WHERE id = #{id}")
    Message findById(Long id);

    @Select("SELECT * FROM agent_message WHERE chat_id = #{chatId} ORDER BY created_at ASC")
    List<Message> findByChatId(Long chatId);

    @Select("SELECT * FROM agent_message ORDER BY created_at DESC")
    List<Message> findAll();

    @Insert("INSERT INTO agent_message (chat_id, role, content, model, audio_url, image_urls, tools, tool_results, created_at) " +
            "VALUES (#{chatId}, #{role}, #{content}, #{model}, #{audioUrl}, #{imageUrls}, #{tools}, #{toolResults}, #{createdAt})")
    int insert(Message message);

    @Update("UPDATE agent_message SET chat_id=#{chatId}, role=#{role}, content=#{content}, model=#{model}, " +
            "audio_url=#{audioUrl}, image_urls=#{imageUrls}, tools=#{tools}, tool_results=#{toolResults} WHERE id=#{id}")
    int update(Message message);

    @Delete("DELETE FROM agent_message WHERE id = #{id}")
    int deleteById(Long id);
}