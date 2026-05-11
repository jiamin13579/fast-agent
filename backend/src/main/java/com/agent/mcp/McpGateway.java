package com.agent.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class McpGateway {

    @Value("${agent.mcp.default-url:http://localhost:9000}")
    private String defaultUrl;

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public McpGateway() {
        this.webClient = WebClient.builder().build();
    }

    public McpResponse execute(String tool, Map<String, Object> params) {
        try {
            McpRequest request = new McpRequest(tool, params);

            String response =
                    webClient
                            .post()
                            .uri(defaultUrl + "/execute")
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(objectMapper.writeValueAsString(request))
                            .retrieve()
                            .bodyToMono(String.class)
                            .block();

            return objectMapper.readValue(response, McpResponse.class);
        } catch (Exception e) {
            return McpResponse.fail(e.getMessage());
        }
    }
}
