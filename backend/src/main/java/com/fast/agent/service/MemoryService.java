package com.fast.agent.service;

import com.fast.agent.entity.Conversation;
import com.fast.agent.entity.ChatMessage;
import com.fast.agent.repository.ConversationMapper;
import com.fast.agent.repository.ChatMessageMapper;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MemoryService {

    @Autowired private ChatMessageMapper messageMapper;

    @Autowired private ConversationMapper chatMapper;

    private static final int MAX_CONTEXT_MESSAGES = 50;

    public List<Map<String, String>> getHistory(Long chatId) {
        List<ChatMessage> messages = messageMapper.findByConversationId(chatId);

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
        ChatMessage message = new ChatMessage();
        message.setConversationId(chatId);
        message.setRole(role);
        message.setContent(content);
        messageMapper.insert(message);
    }

    public void clearHistory(Long chatId) {
        List<ChatMessage> messages = messageMapper.findByConversationId(chatId);
        for (ChatMessage m : messages) {
            messageMapper.deleteById(m.getId());
        }
    }

    public Conversation getOrCreateChat(Long chatId) {
        if (chatId != null) {
            Conversation chat = chatMapper.findById(chatId);
            if (chat != null) return chat;
        }

        Conversation newChat = new Conversation();
        newChat.setName("新会话");
        chatMapper.insert(newChat);
        return newChat;
    }
}
