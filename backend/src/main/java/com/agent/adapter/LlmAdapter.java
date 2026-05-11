package com.agent.adapter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class LlmAdapter {

    private final String provider;
    private final String apiKey;

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LlmAdapter(
            @Value("${agent.llm.provider:minimax}") String provider,
            @Value("${agent.llm.api-key:}") String apiKey,
            @Value("${agent.llm.base-url:https://api.minimax.chat}") String baseUrl) {
        this.provider = provider;
        this.apiKey = apiKey;
        this.webClient =
                WebClient.builder()
                        .baseUrl(baseUrl)
                        .defaultHeader("Authorization", "Bearer " + apiKey)
                        .build();
    }

    public LlmResponse chat(List<Map<String, String>> messages) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", provider);
        body.put("messages", messages);

        String response =
                webClient
                        .post()
                        .uri("/v1/chat/completions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();

        return parseResponse(response);
    }

    private LlmResponse parseResponse(String response) {
        LlmResponse llmResponse = new LlmResponse();
        try {
            JsonNode root = objectMapper.readTree(response);

            // Extract content
            JsonNode choices = root.get("choices");
            if (choices != null && choices.isArray() && choices.size() > 0) {
                JsonNode message = choices.get(0).get("message");
                if (message != null && message.has("content")) {
                    llmResponse.setContent(message.get("content").asText());
                }

                // Extract tool calls if present (for function calling)
                if (message.has("tool_calls")) {
                    List<Map<String, String>> toolCalls = new ArrayList<>();
                    for (JsonNode tc : message.get("tool_calls")) {
                        Map<String, String> call = new HashMap<>();
                        call.put("name", tc.get("function").get("name").asText());
                        call.put("arguments", tc.get("function").get("arguments").asText());
                        toolCalls.add(call);
                    }
                    llmResponse.setToolCalls(toolCalls);
                }
            }
        } catch (Exception e) {
            llmResponse.setContent("Error parsing response: " + e.getMessage());
        }
        return llmResponse;
    }
}
