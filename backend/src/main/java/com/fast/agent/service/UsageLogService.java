package com.fast.agent.service;

import com.fast.agent.entity.UsageLog;
import com.fast.agent.repository.UsageLogMapper;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UsageLogService {

    @Autowired
    private UsageLogMapper usageLogMapper;

    public void save(UsageLog log) {
        usageLogMapper.insert(log);
    }

    public List<UsageLog> list() {
        return usageLogMapper.selectList(null);
    }
}
