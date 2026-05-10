package com.agent.core.task;

import com.agent.dynamic.entity.ScheduledTask;
import com.agent.dynamic.entity.Task;
import com.agent.dynamic.mapper.ScheduledTaskMapper;
import com.agent.dynamic.mapper.TaskMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class TaskScheduler {

    @Autowired
    private ScheduledTaskMapper scheduledTaskMapper;

    @Autowired
    private TaskMapper taskMapper;

    @Autowired
    private TaskExecutor taskExecutor;

    @Scheduled(fixedDelay = 10000)
    public void pollScheduledTasks() {
        List<ScheduledTask> tasks = scheduledTaskMapper.selectList(
            new LambdaQueryWrapper<ScheduledTask>()
                .eq(ScheduledTask::getEnabled, true)
        );

        for (ScheduledTask st : tasks) {
            if (shouldRun(st)) {
                executeTask(st);
            }
        }
    }

    private boolean shouldRun(ScheduledTask task) {
        // Simple implementation: run if last_run is null or past cron schedule
        // A full implementation would use a cron library like quartz or cron-utils
        if (task.getLastRun() == null) return true;

        // For simplicity, just check if 1 minute has passed since last run
        // In production, use proper cron parsing
        long diff = System.currentTimeMillis() - task.getLastRun().getTime();
        return diff > 60000; // 1 minute minimum interval
    }

    private void executeTask(ScheduledTask st) {
        Task task = new Task();
        task.setName(st.getName());
        task.setSkillId(st.getSkillId());
        task.setParams(st.getParams());
        task.setStatus("PENDING");
        taskMapper.insert(task);

        // Update last run
        st.setLastRun(new java.sql.Timestamp(System.currentTimeMillis()));
        scheduledTaskMapper.updateById(st);

        taskExecutor.execute(task);
    }
}
