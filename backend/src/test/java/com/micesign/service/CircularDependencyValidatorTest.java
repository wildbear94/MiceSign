package com.micesign.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

class CircularDependencyValidatorTest {
    private CircularDependencyValidator validator;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        validator = new CircularDependencyValidator();
        objectMapper = new ObjectMapper();
    }

    @Test
    void emptyRules_noCycle() {
        String json = """
            {"fields":[],"conditionalRules":[],"calculationRules":[]}
            """;
        assertThat(validator.detectCycle(json, objectMapper)).isEmpty();
    }

    @Test
    void linearChain_noCycle() {
        String json = """
            {"fields":[],"conditionalRules":[
              {"targetFieldId":"B","conditions":[{"sourceFieldId":"A"}]},
              {"targetFieldId":"C","conditions":[{"sourceFieldId":"B"}]}
            ],"calculationRules":[]}
            """;
        assertThat(validator.detectCycle(json, objectMapper)).isEmpty();
    }

    @Test
    void simpleCycle_detected() {
        String json = """
            {"fields":[],"conditionalRules":[
              {"targetFieldId":"B","conditions":[{"sourceFieldId":"A"}]},
              {"targetFieldId":"A","conditions":[{"sourceFieldId":"B"}]}
            ],"calculationRules":[]}
            """;
        Optional<List<String>> result = validator.detectCycle(json, objectMapper);
        assertThat(result).isPresent();
        assertThat(result.get()).containsAnyOf("A", "B");
    }

    @Test
    void mixedRulesCycle_detected() {
        String json = """
            {"fields":[],"conditionalRules":[
              {"targetFieldId":"B","conditions":[{"sourceFieldId":"A"}]}
            ],"calculationRules":[
              {"targetFieldId":"A","sourceFields":["B"]}
            ]}
            """;
        Optional<List<String>> result = validator.detectCycle(json, objectMapper);
        assertThat(result).isPresent();
    }

    @Test
    void nullJson_noCycle() {
        assertThat(validator.detectCycle(null, objectMapper)).isEmpty();
    }

    @Test
    void selfReference_detected() {
        String json = """
            {"fields":[],"conditionalRules":[
              {"targetFieldId":"A","conditions":[{"sourceFieldId":"A"}]}
            ],"calculationRules":[]}
            """;
        Optional<List<String>> result = validator.detectCycle(json, objectMapper);
        assertThat(result).isPresent();
    }
}
