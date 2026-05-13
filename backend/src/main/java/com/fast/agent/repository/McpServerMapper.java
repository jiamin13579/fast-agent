package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.McpServer;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface McpServerMapper extends BaseMapper<McpServer> {

    default McpServer findById(Long id) {
        return selectById(id);
    }

    default List<McpServer> findAll() {
        return selectList(
                Wrappers.<McpServer>lambdaQuery().orderByDesc(McpServer::getCreatedAt));
    }

    default List<McpServer> findEnabled() {
        return selectList(
                Wrappers.<McpServer>lambdaQuery()
                        .eq(McpServer::getEnabled, true)
                        .orderByDesc(McpServer::getCreatedAt));
    }

    default int update(McpServer mcpServer) {
        return updateById(mcpServer);
    }
}
