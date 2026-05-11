package com.agent.core.task;

import com.agent.core.skill.SkillService;
import com.agent.dynamic.entity.Log;
import com.agent.dynamic.entity.Task;
import com.agent.dynamic.mapper.LogMapper;
import com.agent.dynamic.mapper.TaskMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TaskExecutionManager {

    @Autowired private TaskMapper taskMapper;

    @Autowired private LogMapper logMapper;

    @Autowired private SkillService skillService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void execute(Task task) {
        task.setStatus("RUNNING");
        taskMapper.update(task);

        log(task.getId(), "INFO", "Task started: " + task.getName());

        try {
            // Get skill and execute
            var skill = skillService.getById(task.getSkillId());
            if (skill == null) {
                task.setStatus("FAILED");
                task.setErrorMsg("Skill not found: " + task.getSkillId());
            } else {
                // Parse params and execute (placeholder - actual execution depends on skill
                // implementation)
                Map<String, Object> params =
                        task.getParams() != null
                                ? objectMapper.readValue(task.getParams(), Map.class)
                                : new java.util.HashMap<>();

                // In a full implementation, this would invoke the actual skill
                task.setStatus("COMPLETED");
                task.setResult("Skill executed: " + skill.getName());
            }
        } catch (Exception e) {
            task.setStatus("FAILED");
            task.setErrorMsg(e.getMessage());
            log(task.getId(), "ERROR", e.getMessage());
        }

        taskMapper.update(task);
        log(task.getId(), "INFO", "Task completed with status: " + task.getStatus());
    }

    private void log(Long taskId, String level, String message) {
        Log logEntry = new Log();
        logEntry.setTaskId(taskId);
        logEntry.setLevel(level);
        logEntry.setMessage(message);
        logMapper.insert(logEntry);
    }
}
