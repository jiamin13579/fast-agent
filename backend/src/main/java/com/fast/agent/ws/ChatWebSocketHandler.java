package com.fast.agent.ws;

import com.fast.agent.service.ConversationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ConversationService conversationService;

    private final Map<String, Long> sessionChatMap = new HashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatWebSocketHandler(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message)
            throws Exception {
        Map<String, Object> data = objectMapper.readValue(message.getPayload(), Map.class);
        String action = (String) data.get("action");

        if ("send".equals(action)) {
            Number conversationIdValue =
                    (Number)
                            (data.get("conversation_id") != null
                                    ? data.get("conversation_id")
                                    : data.get("chat_id"));
            if (conversationIdValue == null) {
                throw new IllegalArgumentException("conversation_id 不能为空");
            }
            String content = (String) data.get("content");
            String response = conversationService.generateResponse(conversationIdValue.longValue(), content);

            session.sendMessage(
                    new TextMessage(
                            objectMapper.writeValueAsString(
                                    Map.of("type", "response", "content", response))));
        }
    }
}
