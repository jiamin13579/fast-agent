package com.fast.agent.runtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

@Component
@Slf4j
public class OpenAIProvider implements LLMProvider {

    private final String model;
    private final String apiKey;
    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OpenAIProvider() {
        this.model = "gpt-4o";
        this.apiKey = "your-api-key";
        this.webClient = WebClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .defaultHeader("Authorization", "Bearer " + this.apiKey)
                .build();
    }

    @Override
    public String getName() {
        return "openai";
    }

    @Override
    public String getModel() {
        return model;
    }

    @Override
    public LLMResponse chat(List<Map<String, String>> messages) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
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

    @Override
    public Flux<String> chatStream(List<Map<String, String>> messages) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("stream", true);

        return webClient
                .post()
                .uri("/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .flatMap(data -> Flux.fromArray(data.split("\n")))
                .filter(line -> !line.isBlank())
                .filter(line -> line.startsWith("data:"))
                .map(line -> line.substring(5).trim())
                .filter(line -> !"[DONE]".equals(line))
                .map(line -> {
                    try {
                        JsonNode root = objectMapper.readTree(line);
                        JsonNode choices = root.get("choices");
                        if (choices != null && choices.isArray() && choices.size() > 0) {
                            JsonNode delta = choices.get(0).get("delta");
                            if (delta != null && delta.has("content")) {
                                return delta.get("content").asText();
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Failed to parse SSE chunk: {}", e.getMessage());
                    }
                    return "";
                })
                .filter(content -> !content.isEmpty());
    }

    private LLMResponse parseResponse(String response) {
        LLMResponse llmResponse = new LLMResponse();
        try {
            JsonNode root = objectMapper.readTree(response);

            JsonNode choices = root.get("choices");
            if (choices != null && choices.isArray() && choices.size() > 0) {
                JsonNode message = choices.get(0).get("message");
                if (message != null && message.has("content")) {
                    llmResponse.setContent(message.get("content").asText());
                }

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