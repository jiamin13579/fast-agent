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

    @Autowired private ChatMessageMapper chatMessageMapper;

    @Autowired private ConversationMapper conversationMapper;

    private static final int MAX_CONTEXT_MESSAGES = 50;

    public List<Map<String, String>> getHistory(Long conversationId) {
        List<ChatMessage> messages = chatMessageMapper.findByConversationId(conversationId);

        return messages.stream()
                .map(m -> Map.of("role", m.getRole(), "content", m.getContent()))
                .collect(Collectors.toList());
    }

    public List<Map<String, String>> getContextWindow(Long conversationId, int maxMessages) {
        List<Map<String, String>> history = getHistory(conversationId);
        if (history.size() <= maxMessages) return history;
        return history.subList(history.size() - maxMessages, history.size());
    }

    public void saveMessage(Long conversationId, String role, String content) {
        ChatMessage message = new ChatMessage();
        message.setConversationId(conversationId);
        message.setRole(role);
        message.setContent(content);
        chatMessageMapper.insert(message);
    }

    public void clearHistory(Long conversationId) {
        List<ChatMessage> messages = chatMessageMapper.findByConversationId(conversationId);
        for (ChatMessage m : messages) {
            chatMessageMapper.deleteById(m.getId());
        }
    }

    public Conversation getOrCreateConversation(Long conversationId) {
        if (conversationId != null) {
            Conversation conversation = conversationMapper.findById(conversationId);
            if (conversation != null) return conversation;
        }

        Conversation newConversation = new Conversation();
        newConversation.setName("新会话");
        conversationMapper.insert(newConversation);
        return newConversation;
    }
}
