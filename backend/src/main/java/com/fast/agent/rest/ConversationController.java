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
@RequestMapping("/api/conversations")
public class ConversationController {

    @Autowired private ConversationService conversationService;

    @PostMapping("/{conversationUuid}/messages")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void sendMessage(
            @PathVariable String conversationUuid, @RequestBody Map<String, Object> request) {
        String content =
                (String)
                        (request.get("content") != null
                                ? request.get("content")
                                : request.get("message"));
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content 不能为空");
        }
        String clientMsgId = (String) request.get("client_msg_id");
        conversationService.send(conversationUuid, content, clientMsgId);
    }

    @GetMapping("/{conversationUuid}/messages")
    public List<ChatMessage> getMessages(@PathVariable String conversationUuid) {
        return conversationService.getHistory(conversationUuid);
    }

    @PostMapping
    public Map<String, Object> createConversation(@RequestBody Map<String, String> request) {
        return conversationService.createConversation(request.getOrDefault("name", "新会话"));
    }

    @GetMapping
    public List<Conversation> listConversations() {
        return conversationService.listConversations();
    }

    @DeleteMapping("/{conversationUuid}")
    public Map<String, Object> deleteConversation(@PathVariable String conversationUuid) {
        return conversationService.deleteConversation(conversationUuid);
    }

    @PatchMapping("/{conversationUuid}")
    public Map<String, Object> renameConversation(
            @PathVariable String conversationUuid, @RequestBody Map<String, String> request) {
        return conversationService.renameConversation(conversationUuid, request.get("name"));
    }
}