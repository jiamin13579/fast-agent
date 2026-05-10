package com.agent.core.task;

import com.agent.dynamic.entity.ScheduledTask;
import com.agent.dynamic.mapper.ScheduledTaskMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/task")
public class TaskController {

    @Autowired
    private ScheduledTaskMapper scheduledTaskMapper;

    @GetMapping("/list")
    public List<ScheduledTask> list() {
        return scheduledTaskMapper.selectList(null);
    }

    @PostMapping("/save")
    public Object save(@RequestBody ScheduledTask task) {
        if (task.getId() == null) {
            scheduledTaskMapper.insert(task);
        } else {
            scheduledTaskMapper.updateById(task);
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
        ScheduledTask task = scheduledTaskMapper.selectById(id);
        if (task != null) {
            task.setEnabled(!task.getEnabled());
            scheduledTaskMapper.updateById(task);
        }
        return Map.of("success", true);
    }
}