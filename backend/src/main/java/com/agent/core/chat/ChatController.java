package com.agent.core.chat;

import com.agent.dynamic.entity.Chat;
import com.agent.dynamic.entity.Message;
import com.agent.dynamic.mapper.ChatMapper;
import com.agent.dynamic.mapper.MessageMapper;
import com.agent.core.agent.LlmAgent;
import com.agent.core.memory.MemoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private LlmAgent llmAgent;

    @Autowired
    private MemoryService memoryService;

    @Autowired
    private ChatMapper chatMapper;

    @Autowired
    private MessageMapper messageMapper;

    @PostMapping("/send")
    public Map<String, Object> send(@RequestBody Map<String, Object> request) {
        Long chatId = ((Number) request.get("chat_id")).longValue();
        String content = (String) request.get("content");

        Chat chat = chatMapper.findById(chatId);
        List<Map<String, String>> history = memoryService.getHistory(chatId);

        String response = llmAgent.process(content, history);

        Message userMsg = new Message();
        userMsg.setChatId(chatId);
        userMsg.setRole("user");
        userMsg.setContent(content);
        messageMapper.insert(userMsg);

        Message assistantMsg = new Message();
        assistantMsg.setChatId(chatId);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(response);
        messageMapper.insert(assistantMsg);

        return Map.of("response", response);
    }

    @GetMapping("/history/{chatId}")
    public List<Message> getHistory(@PathVariable Long chatId) {
        return messageMapper.findByChatId(chatId);
    }

    @PostMapping("/create")
    public Map<String, Object> createChat(@RequestBody Map<String, String> request) {
        Chat chat = new Chat();
        chat.setName(request.getOrDefault("name", "新会话"));
        chatMapper.insert(chat);
        return Map.of("chat_id", chat.getId(), "name", chat.getName());
    }

    @GetMapping("/list")
    public List<Chat> listChats() {
        return chatMapper.findAll();
    }
}