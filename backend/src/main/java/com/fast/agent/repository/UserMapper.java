package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.User;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    default Optional<User> findById(Long id) {
        return Optional.ofNullable(selectById(id));
    }

    default Optional<User> findByEmail(String email) {
        return Optional.ofNullable(
                selectOne(Wrappers.<User>lambdaQuery().eq(User::getEmail, email)));
    }

    default List<User> findAll() {
        return selectList(Wrappers.emptyWrapper());
    }

    default void update(User user) {
        updateById(user);
    }

}
