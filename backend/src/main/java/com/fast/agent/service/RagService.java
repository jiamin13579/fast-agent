package com.fast.agent.service;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class RagService {

    @Value("${agent.knowledge.path:./knowledge}")
    private String knowledgePath;

    public String retrieve(String query) {
        List<FileInfo> files = listFiles(knowledgePath);
        if (files.isEmpty()) return "";

        List<SearchResult> results = new ArrayList<>();
        for (FileInfo file : files) {
            String content = readFile(file.path);
            double score = calculateSimilarity(query, content);
            if (score > 0.1) { // Threshold
                results.add(new SearchResult(file.path, content, score));
            }
        }

        results.sort((a, b) -> Double.compare(b.score, a.score));
        return buildContext(results.subList(0, Math.min(3, results.size())));
    }

    private List<FileInfo> listFiles(String dir) {
        List<FileInfo> files = new ArrayList<>();
        try {
            Path path = Paths.get(dir);
            if (!Files.exists(path)) return files;

            Files.walk(path)
                    .filter(Files::isRegularFile)
                    .filter(
                            p -> {
                                String ext = p.toString().toLowerCase();
                                return ext.endsWith(".txt")
                                        || ext.endsWith(".md")
                                        || ext.endsWith(".pdf");
                            })
                    .forEach(
                            p -> files.add(new FileInfo(p.toString(), p.getFileName().toString())));
        } catch (IOException e) {
            // Ignore
        }
        return files;
    }

    private String readFile(String path) {
        try {
            return Files.readString(Path.of(path));
        } catch (IOException e) {
            return "";
        }
    }

    private double calculateSimilarity(String query, String content) {
        // Simple keyword matching - can be upgraded to embeddings
        Set<String> queryWords = new HashSet<>(Arrays.asList(query.toLowerCase().split("\\s+")));
        Set<String> contentWords =
                new HashSet<>(Arrays.asList(content.toLowerCase().split("\\s+")));

        queryWords.retainAll(contentWords);
        return (double) queryWords.size() / queryWords.size();
    }

    private String buildContext(List<SearchResult> results) {
        if (results.isEmpty()) return "";

        StringBuilder sb = new StringBuilder("相关知识：\n");
        for (SearchResult r : results) {
            sb.append("文件: ").append(r.path).append("\n");
            sb.append("内容: ")
                    .append(r.content.substring(0, Math.min(500, r.content.length())))
                    .append("\n");
            sb.append("---\n");
        }
        return sb.toString();
    }

    public List<String> listKnowledgeFiles() {
        return listFiles(knowledgePath).stream().map(f -> f.path).collect(Collectors.toList());
    }

    private record FileInfo(String path, String name) {}

    private record SearchResult(String path, String content, double score) {}
}
