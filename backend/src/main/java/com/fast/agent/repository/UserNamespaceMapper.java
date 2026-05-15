package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.UserNamespace;
import java.util.List;

public interface UserNamespaceMapper extends BaseMapper<UserNamespace> {

    default List<UserNamespace> findByNamespaceId(Long namespaceId) {
        return selectList(Wrappers.<UserNamespace>lambdaQuery()
            .eq(UserNamespace::getNamespaceId, namespaceId));
    }

    default List<UserNamespace> findByUserId(Long userId) {
        return selectList(Wrappers.<UserNamespace>lambdaQuery()
            .eq(UserNamespace::getUserId, userId));
    }

    default UserNamespace findByUserIdAndNamespaceId(Long userId, Long namespaceId) {
        return selectOne(Wrappers.<UserNamespace>lambdaQuery()
            .eq(UserNamespace::getUserId, userId)
            .eq(UserNamespace::getNamespaceId, namespaceId));
    }
}
