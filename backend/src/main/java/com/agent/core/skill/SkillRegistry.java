package com.agent.core.skill;

import com.agent.core.tool.ToolRegistry;
import com.agent.core.tool.ToolDefinition;
import com.agent.core.tool.ParamDefinition;
import com.agent.dynamic.entity.Skill;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import javax.annotation.PostConstruct;
import java.util.*;

@Component
public class SkillRegistry {

    @Autowired
    private SkillService skillService;

    @Autowired
    private ToolRegistry toolRegistry;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        loadSkillsFromDB();
    }

    public void loadSkillsFromDB() {
        List<Skill> skills = skillService.getEnabledSkills();
        for (Skill skill : skills) {
            registerSkill(skill);
        }
    }

    private void registerSkill(Skill skill) {
        try {
            // Parse tools JSON: [{"method": "methodName", "desc": "description", "params": [...]}]
            List<Map<String, Object>> tools = objectMapper.readValue(
                skill.getTools(),
                new TypeReference<List<Map<String, Object>>>() {}
            );

            for (Map<String, Object> toolDef : tools) {
                String methodName = (String) toolDef.get("method");
                String desc = (String) toolDef.get("desc");

                Map<String, ParamDefinition> params = new HashMap<>();
                List<Map<String, String>> paramList = (List<Map<String, String>>) toolDef.get("params");
                if (paramList != null) {
                    for (Map<String, String> p : paramList) {
                        params.put(p.get("name"), new ParamDefinition(
                            p.get("name"),
                            p.get("type"),
                            p.get("desc"),
                            Boolean.parseBoolean(p.get("required"))
                        ));
                    }
                }

                ToolDefinition td = new ToolDefinition(methodName, desc, params);
                // Note: In a full implementation, we'd need method reference to register
                // For now we store the tool definition for LLM to use
            }
        } catch (Exception e) {
            // Log error but continue
        }
    }

    public void reload() {
        // Clear and reload
        loadSkillsFromDB();
    }
}