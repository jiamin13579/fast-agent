package com.fast.agent.runtime;

import java.util.List;
import java.util.Map;
import reactor.core.publisher.Flux;

public interface LLMProvider {
    String getName();
    String getModel();

    LLMResponse chat(List<Map<String, String>> messages);
    Flux<String> chatStream(List<Map<String, String>> messages);
}