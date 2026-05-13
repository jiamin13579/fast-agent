package com.fast.agent.service;

import com.fast.agent.engine.LLMAgent;
import com.fast.agent.entity.ChatMessage;
import com.fast.agent.entity.Conversation;
import com.fast.agent.repository.ChatMessageMapper;
import com.fast.agent.repository.ConversationMapper;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ConversationService {

    @Autowired private LLMAgent llmAgent;

    @Autowired private MemoryService memoryService;

    @Autowired private ConversationMapper conversationMapper;

    @Autowired private ChatMessageMapper chatMessageMapper;

    public Map<String, Object> send(Long conversationId, String content) {
        Conversation chat = conversationMapper.findById(conversationId);
        if (chat == null) {
            throw new IllegalArgumentException("会话不存在: " + conversationId);
        }

        String response = generateResponse(conversationId, content);

        ChatMessage userMsg = new ChatMessage();
        userMsg.setConversationId(conversationId);
        userMsg.setRole("user");
        userMsg.setContent(content);
        chatMessageMapper.insert(userMsg);

        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setConversationId(conversationId);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(response);
        chatMessageMapper.insert(assistantMsg);

        return Map.of("response", response);
    }

    public String generateResponse(Long conversationId, String content) {
        List<Map<String, String>> history = memoryService.getHistory(conversationId);
        try {
            return llmAgent.process(content, history);
        } catch (Exception e) {
            return "LLM 服务暂不可用，请检查 agent.llm 配置或网络后重试。";
        }
    }

    public List<ChatMessage> getHistory(Long conversationId) {
        return chatMessageMapper.findByConversationId(conversationId);
    }

    public Map<String, Object> editMessage(Long messageId, String newContent) {
        if (newContent == null || newContent.isBlank()) {
            throw new IllegalArgumentException("content 不能为空");
        }

        ChatMessage target = chatMessageMapper.findById(messageId);
        if (target == null || !"user".equals(target.getRole())) {
            throw new IllegalArgumentException("只支持编辑用户消息");
        }

        List<ChatMessage> historyMessages = chatMessageMapper.findByConversationId(target.getConversationId());
        int targetIndex = findMessageIndex(historyMessages, messageId);
        if (targetIndex < 0) {
            throw new IllegalArgumentException("消息不存在");
        }

        for (int i = targetIndex + 1; i < historyMessages.size(); i++) {
            if ("user".equals(historyMessages.get(i).getRole())) {
                throw new IllegalArgumentException("仅支持编辑最后一条用户消息");
            }
        }

        target.setContent(newContent);
        chatMessageMapper.update(target);

        if (targetIndex + 1 < historyMessages.size()) {
            ChatMessage maybeAssistant = historyMessages.get(targetIndex + 1);
            if ("assistant".equals(maybeAssistant.getRole())) {
                chatMessageMapper.deleteById(maybeAssistant.getId());
            }
        }

        List<Map<String, String>> historyBefore = memoryService.getHistory(target.getConversationId());
        if (!historyBefore.isEmpty()) {
            historyBefore = historyBefore.subList(0, Math.max(0, historyBefore.size() - 1));
        }

        String response;
        try {
            response = llmAgent.process(newContent, historyBefore);
        } catch (Exception e) {
            response = "LLM 服务暂不可用，请检查 agent.llm 配置或网络后重试。";
        }

        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setConversationId(target.getConversationId());
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(response);
        chatMessageMapper.insert(assistantMsg);

        return Map.of("success", true, "response", response);
    }

    public Map<String, Object> recallMessage(Long messageId) {
        ChatMessage target = chatMessageMapper.findById(messageId);
        if (target == null || !"user".equals(target.getRole())) {
            throw new IllegalArgumentException("只支持撤回用户消息");
        }

        List<ChatMessage> historyMessages = chatMessageMapper.findByConversationId(target.getConversationId());
        int targetIndex = findMessageIndex(historyMessages, messageId);
        if (targetIndex < 0) {
            throw new IllegalArgumentException("消息不存在");
        }

        for (int i = targetIndex + 1; i < historyMessages.size(); i++) {
            if ("user".equals(historyMessages.get(i).getRole())) {
                throw new IllegalArgumentException("仅支持撤回最后一条用户消息");
            }
        }

        chatMessageMapper.deleteById(messageId);
        if (targetIndex + 1 < historyMessages.size()) {
            ChatMessage maybeAssistant = historyMessages.get(targetIndex + 1);
            if ("assistant".equals(maybeAssistant.getRole())) {
                chatMessageMapper.deleteById(maybeAssistant.getId());
            }
        }
        return Map.of("success", true);
    }

    public Map<String, Object> createConversation(String name) {
        Conversation conversation = new Conversation();
        conversation.setName(name == null || name.isBlank() ? "新会话" : name);
        conversationMapper.insert(conversation);
        return Map.of(
                "id",
                conversation.getId(),
                "conversation_id",
                conversation.getId(),
                "chat_id",
                conversation.getId(),
                "name",
                conversation.getName());
    }

    public List<Conversation> listConversations() {
        return conversationMapper.findAll();
    }

    public Map<String, Object> deleteConversation(Long conversationId) {
        chatMessageMapper.deleteByConversationId(conversationId);
        int deleted = conversationMapper.deleteById(conversationId);
        return Map.of("success", deleted > 0);
    }

    private int findMessageIndex(List<ChatMessage> messages, Long messageId) {
        for (int i = 0; i < messages.size(); i++) {
            if (messageId.equals(messages.get(i).getId())) {
                return i;
            }
        }
        return -1;
    }
}
