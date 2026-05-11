package com.agent.core.task;

import com.agent.dynamic.entity.ScheduledTask;
import com.agent.dynamic.mapper.ScheduledTaskMapper;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/task")
public class TaskController {

    @Autowired private ScheduledTaskMapper scheduledTaskMapper;

    @GetMapping("/list")
    public List<ScheduledTask> list() {
        return scheduledTaskMapper.findAll();
    }

    @PostMapping("/save")
    public Object save(@RequestBody ScheduledTask task) {
        if (task.getId() == null) {
            scheduledTaskMapper.insert(task);
        } else {
            scheduledTaskMapper.update(task);
        }
        return Map.of("success", true);
    }

    @DeleteMapping("/{id}")
    public Object delete(@PathVariable Long id) {
        scheduledTaskMapper.deleteById(id);
        return Map.of("success", true);
    }

    @PostMapping("/toggle/{id}")
    public Object toggle(@PathVariable Long id) {
        ScheduledTask task = scheduledTaskMapper.findById(id);
        if (task != null) {
            task.setEnabled(!task.getEnabled());
            scheduledTaskMapper.update(task);
        }
        return Map.of("success", true);
    }
}
