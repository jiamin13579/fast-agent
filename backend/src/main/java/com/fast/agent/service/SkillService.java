package com.fast.agent.service;

import com.fast.agent.entity.Skill;
import com.fast.agent.repository.SkillMapper;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SkillService {

    @Autowired private SkillMapper skillMapper;

    public List<Skill> getEnabledSkills() {
        return skillMapper.findEnabled();
    }

    public Skill getSkillByName(String name) {
        List<Skill> skills = skillMapper.findAll();
        return skills.stream().filter(s -> name.equals(s.getName())).findFirst().orElse(null);
    }

    public List<Skill> getAllSkills() {
        return skillMapper.findAll();
    }

    public void save(Skill skill) {
        if (skill.getId() == null) {
            skillMapper.insert(skill);
        } else {
            skillMapper.update(skill);
        }
    }

    public void delete(Long id) {
        skillMapper.deleteById(id);
    }

    public Skill getById(Long id) {
        return skillMapper.findById(id);
    }
}
