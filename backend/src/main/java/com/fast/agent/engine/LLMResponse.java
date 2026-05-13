package com.fast.agent.engine;

import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class LLMResponse {
    private String content;
    private List<Map<String, String>> toolCalls;
}
