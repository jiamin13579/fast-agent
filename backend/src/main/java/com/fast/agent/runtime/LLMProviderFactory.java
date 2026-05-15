package com.fast.agent.runtime;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Slf4j
public class LLMProviderFactory {

    @Value("${agent.llm.provider:mock}")
    private String defaultProviderName;

    @Autowired
    private Map<String, LLMProvider> providers;

    @PostConstruct
    public void init() {
        log.info("Available LLM providers: {}", providers.keySet());
        log.info("Default provider: {}", defaultProviderName);
    }

    public LLMProvider getDefaultProvider() {
        return getProvider(defaultProviderName);
    }

    public LLMProvider getProvider(String name) {
        return providers.values().stream()
                .filter(p -> p.getName().equals(name))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("LLM provider not found: " + name));
    }
}