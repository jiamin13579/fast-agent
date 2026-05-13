package com.fast.agent.rest;

import com.fast.agent.entity.Conversation;
import com.fast.agent.entity.ChatMessage;
import com.fast.agent.service.ConversationService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ConversationController {

    @Autowired private ConversationService conversationService;

    @PostMapping("/send")
    public Map<String, Object> send(@RequestBody Map<String, Object> request) {
        Number chatIdValue =
                (Number)
                        (request.get("chat_id") != null
                                ? request.get("chat_id")
                                : request.get("chatId"));
        String content =
                (String)
                        (request.get("content") != null
                                ? request.get("content")
                                : request.get("message"));
        if (chatIdValue == null || content == null || content.isBlank()) {
            throw new IllegalArgumentException("chat_id 和 content 不能为空");
        }
        return conversationService.send(chatIdValue.longValue(), content);
    }

    @GetMapping("/history/{chatId}")
    public List<ChatMessage> getHistory(@PathVariable Long chatId) {
        return conversationService.getHistory(chatId);
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

    @DeleteMapping("/delete/{chatId}")
    public Map<String, Object> deleteConversation(@PathVariable Long chatId) {
        return conversationService.deleteConversation(chatId);
    }
}
