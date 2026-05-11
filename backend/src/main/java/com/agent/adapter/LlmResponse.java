package com.agent.adapter;

import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class LlmResponse {
    private String content;
    private List<Map<String, String>> toolCalls;
}
