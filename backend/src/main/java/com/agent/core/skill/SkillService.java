package com.agent.core.skill;

import com.agent.dynamic.entity.Skill;
import com.agent.dynamic.mapper.SkillMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class SkillService {

    @Autowired
    private SkillMapper skillMapper;

    public List<Skill> getEnabledSkills() {
        return skillMapper.selectList(
            new LambdaQueryWrapper<Skill>().eq(Skill::getEnabled, true)
        );
    }

    public Skill getSkillByName(String name) {
        return skillMapper.selectOne(
            new LambdaQueryWrapper<Skill>().eq(Skill::getName, name)
        );
    }

    public List<Skill> getAllSkills() {
        return skillMapper.selectList(null);
    }

    public void save(Skill skill) {
        if (skill.getId() == null) {
            skillMapper.insert(skill);
        } else {
            skillMapper.updateById(skill);
        }
    }

    public void delete(Long id) {
        skillMapper.deleteById(id);
    }

    public Skill getById(Long id) {
        return skillMapper.selectById(id);
    }
}