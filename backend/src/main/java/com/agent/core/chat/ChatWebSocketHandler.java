package com.agent.core.chat;

import com.agent.core.agent.LlmAgent;
import com.agent.core.memory.MemoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.util.*;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    @Autowired
    private LlmAgent llmAgent;

    @Autowired
    private MemoryService memoryService;

    private final Map<String, Long> sessionChatMap = new HashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map<String, Object> data = objectMapper.readValue(message.getPayload(), Map.class);
        String action = (String) data.get("action");

        if ("send".equals(action)) {
            Long chatId = ((Number) data.get("chat_id")).longValue();
            String content = (String) data.get("content");

            List<Map<String, String>> history = memoryService.getHistory(chatId);
            String response = llmAgent.process(content, history);

            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(
                Map.of("type", "response", "content", response)
            )));
        }
    }
}