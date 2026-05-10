package com.agent.core.skill;

import com.agent.dynamic.entity.Skill;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/skill")
public class SkillController {

    @Autowired
    private SkillService skillService;

    @GetMapping("/list")
    public List<Skill> list() {
        return skillService.getAllSkills();
    }

    @PostMapping("/save")
    public Object save(@RequestBody Skill skill) {
        skillService.save(skill);
        return Map.of("success", true);
    }

    @DeleteMapping("/{id}")
    public Object delete(@PathVariable Long id) {
        skillService.delete(id);
        return Map.of("success", true);
    }

    @GetMapping("/{id}")
    public Skill get(@PathVariable Long id) {
        return skillService.getById(id);
    }
}