package com.fast.agent.service;

import com.fast.agent.entity.ChatMessage;
import com.fast.agent.entity.Conversation;
import com.fast.agent.repository.ChatMessageMapper;
import com.fast.agent.repository.ConversationMapper;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MemoryService {

    @Autowired private ChatMessageMapper chatMessageMapper;

    @Autowired private ConversationMapper conversationMapper;

    private static final int MAX_CONTEXT_MESSAGES = 50;

    public List<Map<String, String>> getHistory(String conversationUuid) {
        List<ChatMessage> messages = chatMessageMapper.findByConversationUuid(conversationUuid);

        return messages.stream()
                .map(m -> Map.of("role", m.getRole(), "content", m.getContent()))
                .collect(Collectors.toList());
    }

    public List<Map<String, String>> getContextWindow(String conversationUuid, int maxMessages) {
        List<Map<String, String>> history = getHistory(conversationUuid);
        if (history.size() <= maxMessages) return history;
        return history.subList(history.size() - maxMessages, history.size());
    }

    public void saveMessage(String conversationUuid, String role, String content) {
        ChatMessage message = new ChatMessage();
        message.setConversationUuid(conversationUuid);
        message.setRole(role);
        message.setContent(content);
        chatMessageMapper.insert(message);
    }

    public void clearHistory(String conversationUuid) {
        List<ChatMessage> messages = chatMessageMapper.findByConversationUuid(conversationUuid);
        for (ChatMessage m : messages) {
            chatMessageMapper.deleteById(m.getId());
        }
    }

    public Conversation getOrCreateConversation(String conversationUuid) {
        if (conversationUuid != null) {
            Conversation conversation = conversationMapper.findByUuid(conversationUuid);
            if (conversation != null) return conversation;
        }
        return null;
    }
}