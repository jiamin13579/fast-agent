package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.Conversation;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ConversationMapper extends BaseMapper<Conversation> {

    default Conversation findById(Long id) {
        return selectById(id);
    }

    default List<Conversation> findAll() {
        return selectList(
                Wrappers.<Conversation>lambdaQuery().orderByDesc(Conversation::getCreatedAt));
    }

    default int update(Conversation conversation) {
        return updateById(conversation);
    }
}
