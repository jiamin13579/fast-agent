package com.agent.core.memory;

import com.agent.dynamic.entity.Message;
import com.agent.dynamic.mapper.MessageMapper;
import com.agent.dynamic.mapper.ChatMapper;
import com.agent.dynamic.entity.Chat;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MemoryService {

    @Autowired
    private MessageMapper messageMapper;

    @Autowired
    private ChatMapper chatMapper;

    private static final int MAX_CONTEXT_MESSAGES = 50;

    public List<Map<String, String>> getHistory(Long chatId) {
        List<Message> messages = messageMapper.selectList(
            new LambdaQueryWrapper<Message>()
                .eq(Message::getChatId, chatId)
                .orderByAsc(Message::getCreatedAt)
        );

        return messages.stream()
            .map(m -> Map.of("role", m.getRole(), "content", m.getContent()))
            .collect(Collectors.toList());
    }

    public List<Map<String, String>> getContextWindow(Long chatId, int maxMessages) {
        List<Map<String, String>> history = getHistory(chatId);
        if (history.size() <= maxMessages) return history;
        return history.subList(history.size() - maxMessages, history.size());
    }

    public void saveMessage(Long chatId, String role, String content) {
        Message message = new Message();
        message.setChatId(chatId);
        message.setRole(role);
        message.setContent(content);
        messageMapper.insert(message);
    }

    public void clearHistory(Long chatId) {
        messageMapper.delete(
            new LambdaQueryWrapper<Message>().eq(Message::getChatId, chatId)
        );
    }

    public Chat getOrCreateChat(Long chatId) {
        if (chatId != null) {
            Chat chat = chatMapper.selectById(chatId);
            if (chat != null) return chat;
        }

        Chat newChat = new Chat();
        newChat.setName("新会话");
        chatMapper.insert(newChat);
        return newChat;
    }
}
