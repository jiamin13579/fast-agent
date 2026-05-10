package com.agent.dynamic.mapper;

import com.agent.dynamic.entity.McpServer;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Delete;
import java.util.List;

@Mapper
public interface McpServerMapper {
    @Select("SELECT * FROM agent_mcp_server WHERE id = #{id}")
    McpServer findById(Long id);

    @Select("SELECT * FROM agent_mcp_server ORDER BY created_at DESC")
    List<McpServer> findAll();

    @Select("SELECT * FROM agent_mcp_server WHERE enabled = true ORDER BY created_at DESC")
    List<McpServer> findEnabled();

    @Insert("INSERT INTO agent_mcp_server (name, description, host, port, transport_type, config, enabled, created_at, updated_at) " +
            "VALUES (#{name}, #{description}, #{host}, #{port}, #{transportType}, #{config}, #{enabled}, #{createdAt}, #{updatedAt})")
    int insert(McpServer mcpServer);

    @Update("UPDATE agent_mcp_server SET name=#{name}, description=#{description}, host=#{host}, port=#{port}, " +
            "transport_type=#{transportType}, config=#{config}, enabled=#{enabled}, updated_at=#{updatedAt} WHERE id=#{id}")
    int update(McpServer mcpServer);

    @Delete("DELETE FROM agent_mcp_server WHERE id = #{id}")
    int deleteById(Long id);
}