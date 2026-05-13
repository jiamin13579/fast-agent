package com.fast.agent.ws;

import com.fast.agent.entity.ChatMessage;
import com.fast.agent.repository.ChatMessageMapper;
import com.fast.agent.service.ConversationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import reactor.core.publisher.Flux;

@Component
public class ConversationWebSocketHandler extends TextWebSocketHandler {

    private final ConversationService conversationService;
    private final ChatMessageMapper chatMessageMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ConversationWebSocketHandler(ConversationService conversationService, ChatMessageMapper chatMessageMapper) {
        this.conversationService = conversationService;
        this.chatMessageMapper = chatMessageMapper;
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message)
            throws Exception {
        Map<String, Object> data = objectMapper.readValue(message.getPayload(), Map.class);
        String action = (String) data.get("action");

        switch (action) {
            case "send" -> handleSend(session, data);
            default -> sendError(session, "unknown action: " + action);
        }
    }

    private void handleSend(WebSocketSession session, Map<String, Object> data) throws Exception {
        String conversationUuid = extractString(data, "conversation_uuid", "conversationUuid");
        String content = extractString(data, "content", "message");

        if (conversationUuid == null || content == null || content.isBlank()) {
            sendError(session, "conversation_uuid and content are required");
            return;
        }

        String clientMsgId = extractString(data, "client_msg_id", "clientMsgId");
        String serverMsgId = UUID.randomUUID().toString();

        sendJson(session, Map.of("type", "start", "server_msg_id", serverMsgId, "client_msg_id", clientMsgId));

        CountDownLatch latch = new CountDownLatch(1);
        StringBuilder fullResponse = new StringBuilder();

        Flux<String> flux = conversationService.streamResponse(conversationUuid, content);

        flux.subscribe(
                chunk -> {
                    fullResponse.append(chunk);
                    try {
                        sendJson(session, Map.of("type", "chunk", "content", chunk, "server_msg_id", serverMsgId, "client_msg_id", clientMsgId));
                    } catch (Exception ignored) {}
                },
                error -> {
                    try {
                        sendJson(session, Map.of("type", "error", "message", error.getMessage(), "server_msg_id", serverMsgId));
                    } catch (Exception ignored) {}
                    latch.countDown();
                },
                () -> {
                    try {
                        saveMessages(conversationUuid, content, fullResponse.toString());
                        sendJson(session, Map.of("type", "done", "server_msg_id", serverMsgId));
                    } catch (Exception ignored) {}
                    latch.countDown();
                });

        latch.await();
    }

    private void saveMessages(String conversationUuid, String userContent, String assistantContent) {
        ChatMessage userMsg = new ChatMessage();
        userMsg.setUuid(UUID.randomUUID().toString());
        userMsg.setConversationUuid(conversationUuid);
        userMsg.setRole("user");
        userMsg.setContent(userContent);
        chatMessageMapper.insert(userMsg);

        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setUuid(UUID.randomUUID().toString());
        assistantMsg.setConversationUuid(conversationUuid);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(assistantContent);
        chatMessageMapper.insert(assistantMsg);
    }

    private String extractString(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            Object value = data.get(key);
            if (value instanceof String s && !s.isBlank()) return s;
        }
        return null;
    }

    private void sendJson(WebSocketSession session, Object data) {
        try {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(data)));
        } catch (Exception ignored) {}
    }

    private void sendError(WebSocketSession session, String message) {
        try {
            sendJson(session, Map.of("type", "error", "message", message));
        } catch (Exception ignored) {}
    }
}