package com.fast.agent.service;

import com.fast.agent.runtime.LLMProvider;
import com.fast.agent.runtime.LLMProviderFactory;
import com.fast.agent.entity.ChatMessage;
import com.fast.agent.entity.Conversation;
import com.fast.agent.repository.ChatMessageMapper;
import com.fast.agent.repository.ConversationMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;

@Service
public class ConversationService {

    @Autowired private MemoryService memoryService;

    @Autowired private ConversationMapper conversationMapper;

    @Autowired private ChatMessageMapper chatMessageMapper;

    @Autowired private SocketIOPushService pushService;

    @Autowired private LLMProviderFactory providerFactory;

    public void send(String conversationUuid, String content, String clientMsgId) {
        Long currentUserId = getCurrentUserId();
        Conversation conversation = conversationMapper.findByUuidAndUserId(conversationUuid, currentUserId);
        if (conversation == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }

        List<Map<String, String>> history = memoryService.getHistory(conversationUuid);
        List<Map<String, String>> messages = new ArrayList<>(history);
        messages.add(Map.of("role", "user", "content", content));

        ChatMessage userMsg = new ChatMessage();
        userMsg.setUuid(UUID.randomUUID().toString());
        userMsg.setConversationUuid(conversationUuid);
        userMsg.setRole("user");
        userMsg.setContent(content);
        chatMessageMapper.insert(userMsg);

        pushService.pushStreamEvent(conversationUuid, Map.of(
            "type", "start",
            "client_msg_id", clientMsgId
        ));

        StringBuilder fullContent = new StringBuilder();
        String assistantMsgUuid = UUID.randomUUID().toString();

        providerFactory.getDefaultProvider().chatStream(messages)
            .doOnNext(chunk -> {
                fullContent.append(chunk);
                pushService.pushStreamEvent(conversationUuid, Map.of(
                    "type", "chunk",
                    "content", chunk,
                    "client_msg_id", clientMsgId
                ));
            })
            .doOnError(e -> {
                String partial = fullContent.toString();
                if (!partial.isEmpty()) {
                    ChatMessage partialMsg = new ChatMessage();
                    partialMsg.setUuid(assistantMsgUuid);
                    partialMsg.setConversationUuid(conversationUuid);
                    partialMsg.setRole("assistant");
                    partialMsg.setContent(partial);
                    partialMsg.setCreatedAt(java.time.LocalDateTime.now());
                    chatMessageMapper.insert(partialMsg);
                }
                pushService.pushStreamEvent(conversationUuid, Map.of(
                    "type", "error",
                    "message", e.getMessage(),
                    "client_msg_id", clientMsgId
                ));
            })
            .doOnComplete(() -> {
                String response = fullContent.toString();
                ChatMessage assistantMsg = new ChatMessage();
                assistantMsg.setUuid(assistantMsgUuid);
                assistantMsg.setConversationUuid(conversationUuid);
                assistantMsg.setRole("assistant");
                assistantMsg.setContent(response);
                assistantMsg.setCreatedAt(java.time.LocalDateTime.now());
                chatMessageMapper.insert(assistantMsg);

                pushService.pushStreamEvent(conversationUuid, Map.of(
                    "type", "done",
                    "message_uuid", assistantMsgUuid,
                    "client_msg_id", clientMsgId
                ));
            })
            .subscribe();
    }

    public List<ChatMessage> getHistory(String conversationUuid) {
        checkOwnership(conversationUuid);
        return chatMessageMapper.findByConversationUuid(conversationUuid);
    }

    public Map<String, Object> createConversation(String name) {
        Long currentUserId = getCurrentUserId();
        Conversation conversation = new Conversation();
        conversation.setUserId(currentUserId);
        conversation.setUuid(UUID.randomUUID().toString());
        conversation.setName(name == null || name.isBlank() ? "新会话" : name);
        conversationMapper.insert(conversation);

        pushService.pushSync(conversation.getUuid(), Map.of(
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
        Long currentUserId = getCurrentUserId();
        return conversationMapper.findByUserId(currentUserId);
    }

    public Map<String, Object> deleteConversation(String conversationUuid) {
        Long currentUserId = getCurrentUserId();
        Conversation conversation = conversationMapper.findByUuidAndUserId(conversationUuid, currentUserId);
        if (conversation == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }

        chatMessageMapper.deleteByConversationUuid(conversationUuid);
        conversationMapper.deleteById(conversation.getId());

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

        Long currentUserId = getCurrentUserId();
        Conversation conversation = conversationMapper.findByUuidAndUserId(conversationUuid, currentUserId);
        if (conversation == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }

        conversation.setName(name);
        conversationMapper.updateById(conversation);

        pushService.pushSync(conversationUuid, Map.of(
            "action", "rename",
            "uuid", conversationUuid,
            "name", name
        ));

        return Map.of("success", true, "name", name);
    }

    private Long getCurrentUserId() {
        String userId = (String) org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return Long.parseLong(userId);
    }

    private void checkOwnership(String conversationUuid) {
        Long currentUserId = getCurrentUserId();
        Conversation conversation = conversationMapper.findByUuidAndUserId(conversationUuid, currentUserId);
        if (conversation == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }
    }
}