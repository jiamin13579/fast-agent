package com.fast.agent.rest;

import com.fast.agent.entity.Conversation;
import com.fast.agent.entity.ChatMessage;
import com.fast.agent.service.ConversationService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/conversation", "/api/chat"})
public class ConversationController {

    @Autowired private ConversationService conversationService;

    @PostMapping("/send")
    public Map<String, Object> send(@RequestBody Map<String, Object> request) {
        Number conversationIdValue = extractConversationId(request);
        String content =
                (String)
                        (request.get("content") != null
                                ? request.get("content")
                                : request.get("message"));
        if (conversationIdValue == null || content == null || content.isBlank()) {
            throw new IllegalArgumentException("conversation_id 和 content 不能为空");
        }
        return conversationService.send(conversationIdValue.longValue(), content);
    }

    private Number extractConversationId(Map<String, Object> request) {
        Object value =
                request.get("conversation_id") != null
                        ? request.get("conversation_id")
                        : (request.get("conversationId") != null
                                ? request.get("conversationId")
                                : (request.get("chat_id") != null
                                        ? request.get("chat_id")
                                        : request.get("chatId")));
        return value instanceof Number ? (Number) value : null;
    }

    @GetMapping("/history/{conversationId}")
    public List<ChatMessage> getHistory(@PathVariable Long conversationId) {
        return conversationService.getHistory(conversationId);
    }

    @PutMapping("/message/{messageId}/edit")
    public Map<String, Object> editMessage(
            @PathVariable Long messageId, @RequestBody Map<String, String> request) {
        return conversationService.editMessage(messageId, request.get("content"));
    }

    @DeleteMapping("/message/{messageId}/recall")
    public Map<String, Object> recallMessage(@PathVariable Long messageId) {
        return conversationService.recallMessage(messageId);
    }

    @PostMapping("/create")
    public Map<String, Object> createConversation(@RequestBody Map<String, String> request) {
        return conversationService.createConversation(request.getOrDefault("name", "新会话"));
    }

    @GetMapping("/list")
    public List<Conversation> listConversations() {
        return conversationService.listConversations();
    }

    @DeleteMapping("/delete/{conversationId}")
    public Map<String, Object> deleteConversation(@PathVariable Long conversationId) {
        return conversationService.deleteConversation(conversationId);
    }
}
