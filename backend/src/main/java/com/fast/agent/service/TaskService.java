package com.fast.agent.service;

import com.fast.agent.entity.ScheduledTask;
import com.fast.agent.repository.ScheduledTaskMapper;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TaskService {

    @Autowired private ScheduledTaskMapper scheduledTaskMapper;

    public List<ScheduledTask> list() {
        return scheduledTaskMapper.findAll();
    }

    public Map<String, Object> save(ScheduledTask task) {
        if (task.getId() == null) {
            scheduledTaskMapper.insert(task);
        } else {
            scheduledTaskMapper.update(task);
        }
        return Map.of("success", true);
    }

    public Map<String, Object> delete(Long id) {
        scheduledTaskMapper.deleteById(id);
        return Map.of("success", true);
    }

    public Map<String, Object> toggle(Long id) {
        ScheduledTask task = scheduledTaskMapper.findById(id);
        if (task != null) {
            task.setEnabled(!task.getEnabled());
            scheduledTaskMapper.update(task);
        }
        return Map.of("success", true);
    }
}
