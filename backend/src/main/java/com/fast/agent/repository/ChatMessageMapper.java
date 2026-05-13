package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.ChatMessage;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ChatMessageMapper extends BaseMapper<ChatMessage> {

    default ChatMessage findById(Long id) {
        return selectById(id);
    }

    default List<ChatMessage> findByConversationId(Long conversationId) {
        return selectList(
                Wrappers.<ChatMessage>lambdaQuery()
                        .eq(ChatMessage::getConversationId, conversationId)
                        .orderByAsc(ChatMessage::getCreatedAt));
    }

    default List<ChatMessage> findAll() {
        return selectList(Wrappers.<ChatMessage>lambdaQuery().orderByDesc(ChatMessage::getCreatedAt));
    }

    default int update(ChatMessage message) {
        return updateById(message);
    }

    default int deleteByConversationId(Long conversationId) {
        return delete(
                Wrappers.<ChatMessage>lambdaQuery()
                        .eq(ChatMessage::getConversationId, conversationId));
    }
}
