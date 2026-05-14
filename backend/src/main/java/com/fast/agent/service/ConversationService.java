package com.fast.agent.service;

import com.fast.agent.engine.LLMAgent;
import com.fast.agent.engine.LLMClient;
import com.fast.agent.entity.ChatMessage;
import com.fast.agent.entity.Conversation;
import com.fast.agent.repository.ChatMessageMapper;
import com.fast.agent.repository.ConversationMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class ConversationService {

    @Autowired private LLMAgent llmAgent;

    @Autowired private MemoryService memoryService;

    @Autowired private ConversationMapper conversationMapper;

    @Autowired private ChatMessageMapper chatMessageMapper;

    @Autowired private SocketIOPushService pushService;

    public Map<String, Object> send(String conversationUuid, String content) {
        Conversation conversation = conversationMapper.findByUuid(conversationUuid);
        if (conversation == null) {
            throw new IllegalArgumentException("会话不存在: " + conversationUuid);
        }

        String response = generateResponse(conversationUuid, content);

        ChatMessage userMsg = new ChatMessage();
        userMsg.setUuid(UUID.randomUUID().toString());
        userMsg.setConversationUuid(conversationUuid);
        userMsg.setRole("user");
        userMsg.setContent(content);
        chatMessageMapper.insert(userMsg);

        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setUuid(UUID.randomUUID().toString());
        assistantMsg.setConversationUuid(conversationUuid);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(response);
        chatMessageMapper.insert(assistantMsg);

        // Push new message to room
        pushService.pushNewMessage(conversationUuid, Map.of(
            "message_uuid", assistantMsg.getUuid(),
            "role", "assistant",
            "content", response,
            "timestamp", assistantMsg.getCreatedAt().toString()
        ));

        return Map.of("response", response);
    }

    public String generateResponse(String conversationUuid, String content) {
        List<Map<String, String>> history = memoryService.getHistory(conversationUuid);
        try {
            return llmAgent.process(content, history);
        } catch (Exception e) {
            return "LLM 服务暂不可用，请检查 agent.llm 配置或网络后重试。";
        }
    }

    public Flux<String> streamResponse(String conversationUuid, String content) {
        List<Map<String, String>> history = memoryService.getHistory(conversationUuid);
        return llmAgent.processStreamFlux(content, history);
    }

    public List<ChatMessage> getHistory(String conversationUuid) {
        return chatMessageMapper.findByConversationUuid(conversationUuid);
    }

    public Map<String, Object> createConversation(String name) {
        Conversation conversation = new Conversation();
        conversation.setUuid(UUID.randomUUID().toString());
        conversation.setName(name == null || name.isBlank() ? "新会话" : name);
        conversationMapper.insert(conversation);

        // Push sync for new conversation
        pushService.pushSync(conversationUuid, Map.of(
            "action", "create",
            "uuid", conversation.getUuid(),
            "name", conversation.getName()
        ));

        return Map.of(
                "uuid",
                conversation.getUuid(),
                "name",
                conversation.getName());
    }

    public List<Conversation> listConversations() {
        return conversationMapper.findAll();
    }

    public Map<String, Object> deleteConversation(String conversationUuid) {
        chatMessageMapper.deleteByConversationUuid(conversationUuid);
        Conversation conversation = conversationMapper.findByUuid(conversationUuid);
        if (conversation != null) {
            conversationMapper.deleteById(conversation.getId());
        }

        // Push sync for deleted conversation
        pushService.pushSync(conversationUuid, Map.of(
            "action", "delete",
            "uuid", conversationUuid
        ));

        return Map.of("success", true);
    }

    public Map<String, Object> renameConversation(String conversationUuid, String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name 不能为空");
        }
        Conversation conversation = conversationMapper.findByUuid(conversationUuid);
        if (conversation == null) {
            throw new IllegalArgumentException("会话不存在: " + conversationUuid);
        }
        conversation.setName(name);
        conversationMapper.updateById(conversation);

        // Push sync for renamed conversation
        pushService.pushSync(conversationUuid, Map.of(
            "action", "rename",
            "uuid", conversationUuid,
            "name", name
        ));

        return Map.of("success", true, "name", name);
    }
}