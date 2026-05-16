package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fast.agent.entity.AdminNamespace;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import java.util.List;

@Mapper
public interface AdminNamespaceMapper extends BaseMapper<AdminNamespace> {
    @Select("SELECT * FROM admin_namespace WHERE admin_id = #{adminId}")
    List<AdminNamespace> findByAdminId(@Param("adminId") Long adminId);

    @Select("SELECT * FROM admin_namespace WHERE admin_id = #{adminId} AND namespace_id = #{namespaceId}")
    AdminNamespace findByAdminIdAndNamespaceId(@Param("adminId") Long adminId, @Param("namespaceId") Long namespaceId);

    @Select("SELECT * FROM admin_namespace WHERE namespace_id = #{namespaceId}")
    List<AdminNamespace> findByNamespaceId(@Param("namespaceId") Long namespaceId);

    @Select("SELECT COUNT(*) FROM admin_namespace WHERE admin_id = #{adminId} AND namespace_id = #{namespaceId} AND role = 'ADMIN'")
    int countAdminRole(@Param("adminId") Long adminId, @Param("namespaceId") Long namespaceId);
}
