package com.agent.adapter;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class LlmResponse {
    private String content;
    private List<Map<String, String>> toolCalls;
}