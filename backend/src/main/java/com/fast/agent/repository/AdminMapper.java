package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fast.agent.entity.Admin;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import java.util.Optional;

@Mapper
public interface AdminMapper extends BaseMapper<Admin> {
    @Select("SELECT * FROM admin WHERE username = #{username}")
    Optional<Admin> findByUsername(@Param("username") String username);
}
