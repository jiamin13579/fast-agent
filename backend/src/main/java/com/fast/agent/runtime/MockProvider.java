package com.fast.agent.runtime;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Component
@Slf4j
public class MockProvider implements LLMProvider {

    private static final List<MockQA> MOCK_QAS = List.of(
        new MockQA("你好", "你好！有什么可以帮助你的吗？"),
        new MockQA("你是谁", "我是一个 AI 助手，由 Fast Agent 提供支持。"),
        new MockQA("代码", "我来帮你写代码。请告诉我你需要什么功能的代码？"),
        new MockQA("解释", "好的，让我来解释一下这个概念..."),
        new MockQA(".*", "这是一个模拟响应，内容正在生成中...")
    );

    private static final int MIN_DELAY_MS = 50;
    private static final int MAX_DELAY_MS = 200;
    private final Random random = new Random();
    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor();

    @Override
    public String getName() {
        return "mock";
    }

    @Override
    public String getModel() {
        return "mock-model";
    }

    @Override
    public LLMResponse chat(List<Map<String, String>> messages) {
        String userMsg = extractUserMessage(messages);
        String response = matchResponse(userMsg);

        LLMResponse llmResponse = new LLMResponse();
        llmResponse.setContent(response);
        return llmResponse;
    }

    @Override
    public Flux<String> chatStream(List<Map<String, String>> messages) {
        String userMsg = extractUserMessage(messages);
        String response = matchResponse(userMsg);

        return Flux.create(sink -> {
            executor.submit(() -> {
                try {
                    for (int i = 0; i < response.length(); i++) {
                        if (sink.isCancelled()) {
                            return;
                        }
                        int delay = MIN_DELAY_MS + random.nextInt(MAX_DELAY_MS - MIN_DELAY_MS + 1);
                        TimeUnit.MILLISECONDS.sleep(delay);
                        sink.next(String.valueOf(response.charAt(i)));
                    }
                    sink.complete();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    sink.error(new RuntimeException("Mock stream interrupted"));
                }
            });
        });
    }

    private String extractUserMessage(List<Map<String, String>> messages) {
        if (messages == null || messages.isEmpty()) {
            return "";
        }
        for (int i = messages.size() - 1; i >= 0; i--) {
            Map<String, String> msg = messages.get(i);
            if ("user".equals(msg.get("role"))) {
                return msg.get("content");
            }
        }
        return "";
    }

    private String matchResponse(String userMsg) {
        for (MockQA qa : MOCK_QAS) {
            if (Pattern.matches(qa.pattern, userMsg)) {
                return qa.response;
            }
        }
        return MOCK_QAS.get(MOCK_QAS.size() - 1).response;
    }

    private static class MockQA {
        final String pattern;
        final String response;

        MockQA(String pattern, String response) {
            this.pattern = pattern;
            this.response = response;
        }
    }
}