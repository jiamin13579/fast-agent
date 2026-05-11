package com.agent.core.chat;

import com.agent.core.agent.LlmAgent;
import com.agent.core.memory.MemoryService;
import com.agent.dynamic.entity.Chat;
import com.agent.dynamic.entity.Message;
import com.agent.dynamic.mapper.ChatMapper;
import com.agent.dynamic.mapper.MessageMapper;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired private LlmAgent llmAgent;

    @Autowired private MemoryService memoryService;

    @Autowired private ChatMapper chatMapper;

    @Autowired private MessageMapper messageMapper;

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
        Long chatId = chatIdValue.longValue();

        Chat chat = chatMapper.findById(chatId);
        if (chat == null) {
            throw new IllegalArgumentException("会话不存在: " + chatId);
        }
        List<Map<String, String>> history = memoryService.getHistory(chatId);

        String response;
        try {
            response = llmAgent.process(content, history);
        } catch (Exception e) {
            response = "LLM 服务暂不可用，请检查 agent.llm 配置或网络后重试。";
        }

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

    @PutMapping("/message/{messageId}/edit")
    public Map<String, Object> editMessage(
            @PathVariable Long messageId, @RequestBody Map<String, String> request) {
        String newContent = request.get("content");
        if (newContent == null || newContent.isBlank()) {
            throw new IllegalArgumentException("content 不能为空");
        }

        Message target = messageMapper.findById(messageId);
        if (target == null || !"user".equals(target.getRole())) {
            throw new IllegalArgumentException("只支持编辑用户消息");
        }

        List<Message> historyMessages = messageMapper.findByChatId(target.getChatId());
        int targetIndex = -1;
        for (int i = 0; i < historyMessages.size(); i++) {
            if (messageId.equals(historyMessages.get(i).getId())) {
                targetIndex = i;
                break;
            }
        }
        if (targetIndex < 0) {
            throw new IllegalArgumentException("消息不存在");
        }

        // 只允许编辑最后一条用户消息，避免改写历史导致上下文不一致
        for (int i = targetIndex + 1; i < historyMessages.size(); i++) {
            if ("user".equals(historyMessages.get(i).getRole())) {
                throw new IllegalArgumentException("仅支持编辑最后一条用户消息");
            }
        }

        target.setContent(newContent);
        messageMapper.update(target);

        // 若存在紧随其后的 assistant 回复，先删除再按新内容重算
        if (targetIndex + 1 < historyMessages.size()) {
            Message maybeAssistant = historyMessages.get(targetIndex + 1);
            if ("assistant".equals(maybeAssistant.getRole())) {
                messageMapper.deleteById(maybeAssistant.getId());
            }
        }

        List<Map<String, String>> historyBefore = memoryService.getHistory(target.getChatId());
        if (!historyBefore.isEmpty()) {
            historyBefore = historyBefore.subList(0, Math.max(0, historyBefore.size() - 1));
        }

        String response;
        try {
            response = llmAgent.process(newContent, historyBefore);
        } catch (Exception e) {
            response = "LLM 服务暂不可用，请检查 agent.llm 配置或网络后重试。";
        }

        Message assistantMsg = new Message();
        assistantMsg.setChatId(target.getChatId());
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(response);
        messageMapper.insert(assistantMsg);

        return Map.of("success", true, "response", response);
    }

    @DeleteMapping("/message/{messageId}/recall")
    public Map<String, Object> recallMessage(@PathVariable Long messageId) {
        Message target = messageMapper.findById(messageId);
        if (target == null || !"user".equals(target.getRole())) {
            throw new IllegalArgumentException("只支持撤回用户消息");
        }

        List<Message> historyMessages = messageMapper.findByChatId(target.getChatId());
        int targetIndex = -1;
        for (int i = 0; i < historyMessages.size(); i++) {
            if (messageId.equals(historyMessages.get(i).getId())) {
                targetIndex = i;
                break;
            }
        }
        if (targetIndex < 0) {
            throw new IllegalArgumentException("消息不存在");
        }

        // 只允许撤回最后一条用户消息，避免中间删消息后上下文错位
        for (int i = targetIndex + 1; i < historyMessages.size(); i++) {
            if ("user".equals(historyMessages.get(i).getRole())) {
                throw new IllegalArgumentException("仅支持撤回最后一条用户消息");
            }
        }

        messageMapper.deleteById(messageId);
        if (targetIndex + 1 < historyMessages.size()) {
            Message maybeAssistant = historyMessages.get(targetIndex + 1);
            if ("assistant".equals(maybeAssistant.getRole())) {
                messageMapper.deleteById(maybeAssistant.getId());
            }
        }
        return Map.of("success", true);
    }

    @PostMapping("/create")
    public Map<String, Object> createChat(@RequestBody Map<String, String> request) {
        Chat chat = new Chat();
        chat.setName(request.getOrDefault("name", "新会话"));
        chatMapper.insert(chat);
        return Map.of("id", chat.getId(), "chat_id", chat.getId(), "name", chat.getName());
    }

    @GetMapping("/list")
    public List<Chat> listChats() {
        return chatMapper.findAll();
    }

    @DeleteMapping("/delete/{chatId}")
    public Map<String, Object> deleteChat(@PathVariable Long chatId) {
        messageMapper.deleteByChatId(chatId);
        int deleted = chatMapper.deleteById(chatId);
        return Map.of("success", deleted > 0);
    }
}
