package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fast.agent.entity.Skill;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SkillMapper extends BaseMapper<Skill> {

    default Skill findById(Long id) {
        return selectById(id);
    }

    default List<Skill> findAll() {
        return selectList(Wrappers.<Skill>lambdaQuery().orderByDesc(Skill::getCreatedAt));
    }

    default List<Skill> findEnabled() {
        return selectList(
                Wrappers.<Skill>lambdaQuery()
                        .eq(Skill::getEnabled, true)
                        .orderByDesc(Skill::getCreatedAt));
    }

    default int update(Skill skill) {
        return updateById(skill);
    }
}
