package com.fast.agent.engine.tools;

import lombok.Data;

@Data
public class ParamDefinition {
    private String name;
    private String type;
    private String description;
    private boolean required;

    public ParamDefinition() {}

    public ParamDefinition(String name, String type, String description, boolean required) {
        this.name = name;
        this.type = type;
        this.description = description;
        this.required = required;
    }
}
