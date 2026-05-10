package com.agent.core.rag;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/knowledge")
public class KnowledgeController {

    @Autowired
    private RagService ragService;

    @GetMapping("/files")
    public List<String> listFiles() {
        return ragService.listKnowledgeFiles();
    }

    @PostMapping("/search")
    public Map<String, String> search(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        String context = ragService.retrieve(query);
        return Map.of("context", context, "query", query);
    }
}
