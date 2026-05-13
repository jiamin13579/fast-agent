package com.fast.agent.rest;

import com.fast.agent.entity.ScheduledTask;
import com.fast.agent.service.TaskService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/task")
public class TaskController {

    @Autowired private TaskService taskService;

    @GetMapping("/list")
    public List<ScheduledTask> list() {
        return taskService.list();
    }

    @PostMapping("/save")
    public Object save(@RequestBody ScheduledTask task) {
        return taskService.save(task);
    }

    @DeleteMapping("/{id}")
    public Object delete(@PathVariable Long id) {
        return taskService.delete(id);
    }

    @PostMapping("/toggle/{id}")
    public Object toggle(@PathVariable Long id) {
        return taskService.toggle(id);
    }
}
