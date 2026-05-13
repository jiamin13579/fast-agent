package com.fast.agent.rest;

import com.fast.agent.entity.Conversation;
import com.fast.agent.entity.ChatMessage;
import com.fast.agent.service.ConversationService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/conversation")
public class ConversationController {

    @Autowired private ConversationService conversationService;

    @PostMapping("/send")
    public Map<String, Object> send(@RequestBody Map<String, Object> request) {
        String conversationUuid = extractConversationUuid(request);
        String content =
                (String)
                        (request.get("content") != null
                                ? request.get("content")
                                : request.get("message"));
        if (conversationUuid == null || content == null || content.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "conversation_uuid 和 content 不能为空");
        }
        return conversationService.send(conversationUuid, content);
    }

    private String extractConversationUuid(Map<String, Object> request) {
        Object value =
                request.get("conversation_uuid") != null
                        ? request.get("conversation_uuid")
                        : request.get("conversationUuid");
        return value instanceof String ? (String) value : null;
    }

    @GetMapping("/history/{conversationUuid}")
    public List<ChatMessage> getHistory(@PathVariable String conversationUuid) {
        return conversationService.getHistory(conversationUuid);
    }

    @PostMapping("/create")
    public Map<String, Object> createConversation(@RequestBody Map<String, String> request) {
        return conversationService.createConversation(request.getOrDefault("name", "新会话"));
    }

    @GetMapping("/list")
    public List<Conversation> listConversations() {
        return conversationService.listConversations();
    }

    @DeleteMapping("/delete/{conversationUuid}")
    public Map<String, Object> deleteConversation(@PathVariable String conversationUuid) {
        return conversationService.deleteConversation(conversationUuid);
    }

    @PutMapping("/rename/{conversationUuid}")
    public Map<String, Object> renameConversation(
            @PathVariable String conversationUuid, @RequestBody Map<String, String> request) {
        return conversationService.renameConversation(conversationUuid, request.get("name"));
    }
}