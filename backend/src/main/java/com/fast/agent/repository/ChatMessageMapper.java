package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.ChatMessage;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ChatMessageMapper extends BaseMapper<ChatMessage> {

    default ChatMessage findByUuid(String uuid) {
        return selectOne(Wrappers.<ChatMessage>lambdaQuery().eq(ChatMessage::getUuid, uuid));
    }

    default List<ChatMessage> findByConversationUuid(String conversationUuid) {
        return selectList(
                Wrappers.<ChatMessage>lambdaQuery()
                        .eq(ChatMessage::getConversationUuid, conversationUuid)
                        .orderByAsc(ChatMessage::getCreatedAt));
    }

    default List<ChatMessage> findAll() {
        return selectList(Wrappers.<ChatMessage>lambdaQuery().orderByDesc(ChatMessage::getCreatedAt));
    }

    default int deleteByConversationUuid(String conversationUuid) {
        return delete(
                Wrappers.<ChatMessage>lambdaQuery()
                        .eq(ChatMessage::getConversationUuid, conversationUuid));
    }
}