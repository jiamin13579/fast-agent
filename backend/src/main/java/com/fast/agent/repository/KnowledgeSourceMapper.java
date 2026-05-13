package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.KnowledgeSource;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface KnowledgeSourceMapper extends BaseMapper<KnowledgeSource> {

    default KnowledgeSource findById(Long id) {
        return selectById(id);
    }

    default List<KnowledgeSource> findAll() {
        return selectList(
                Wrappers.<KnowledgeSource>lambdaQuery()
                        .orderByDesc(KnowledgeSource::getCreatedAt));
    }

    default List<KnowledgeSource> findEnabled() {
        return selectList(
                Wrappers.<KnowledgeSource>lambdaQuery()
                        .eq(KnowledgeSource::getEnabled, true)
                        .orderByDesc(KnowledgeSource::getCreatedAt));
    }

    default int update(KnowledgeSource knowledgeSource) {
        return updateById(knowledgeSource);
    }
}
