package com.micesign.service.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.FormValidationException;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Validates calculation rules within a template schema for circular dependencies.
 * <p>
 * Used during template schema save to ensure that no calculation rule creates
 * a dependency cycle (e.g., A depends on B, B depends on A).
 */
@Component
public class CircularDependencyValidator {

    private final ObjectMapper objectMapper;

    public CircularDependencyValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Validates the schema definition string for circular dependencies in calculation rules.
     *
     * @param schemaDefinition JSON string of the schema definition
     * @throws FormValidationException if circular dependencies are detected
     */
    public void validate(String schemaDefinition) {
        if (schemaDefinition == null || schemaDefinition.isBlank()) {
            return;
        }

        try {
            JsonNode schema = objectMapper.readTree(schemaDefinition);
            JsonNode calculationRules = schema.get("calculationRules");

            if (calculationRules == null || !calculationRules.isArray() || calculationRules.isEmpty()) {
                return;
            }

            // Build adjacency list: targetFieldId -> dependsOn fields
            Map<String, Set<String>> graph = new LinkedHashMap<>();

            for (JsonNode rule : calculationRules) {
                String targetFieldId = rule.get("targetFieldId").asText();
                JsonNode dependsOn = rule.get("dependsOn");

                Set<String> deps = graph.computeIfAbsent(targetFieldId, k -> new LinkedHashSet<>());
                if (dependsOn != null && dependsOn.isArray()) {
                    for (JsonNode dep : dependsOn) {
                        deps.add(dep.asText());
                    }
                }
            }

            List<List<String>> cycles = detectCycles(graph);

            if (!cycles.isEmpty()) {
                String cycleDescriptions = cycles.stream()
                        .map(cycle -> String.join(" → ", cycle))
                        .collect(Collectors.joining("; "));

                Map<String, String> errors = Map.of(
                        "calculationRules",
                        "순환 의존성이 감지되었습니다: " + cycleDescriptions
                );
                throw new FormValidationException(errors);
            }
        } catch (FormValidationException e) {
            throw e;
        } catch (Exception e) {
            Map<String, String> errors = Map.of(
                    "calculationRules",
                    "계산 규칙 검증 중 오류가 발생했습니다: " + e.getMessage()
            );
            throw new FormValidationException(errors);
        }
    }

    /**
     * Detects all cycles in the dependency graph using DFS.
     *
     * @param graph adjacency list (node -> set of nodes it depends on)
     * @return list of cycles, each represented as a list of field IDs forming the loop
     */
    private List<List<String>> detectCycles(Map<String, Set<String>> graph) {
        List<List<String>> cycles = new ArrayList<>();
        Set<String> allNodes = graph.keySet();

        // Track state: UNVISITED, VISITING, VISITED
        Map<String, VisitState> state = new HashMap<>();
        for (String node : allNodes) {
            state.put(node, VisitState.UNVISITED);
        }

        for (String node : allNodes) {
            if (state.get(node) == VisitState.UNVISITED) {
                dfs(node, new ArrayList<>(), state, graph, cycles);
            }
        }

        return cycles;
    }

    private void dfs(String node, List<String> path,
                     Map<String, VisitState> state,
                     Map<String, Set<String>> graph,
                     List<List<String>> cycles) {

        VisitState nodeState = state.getOrDefault(node, VisitState.UNVISITED);

        if (nodeState == VisitState.VISITED) {
            return;
        }

        if (nodeState == VisitState.VISITING) {
            // Found a cycle — extract from path
            int cycleStart = path.indexOf(node);
            if (cycleStart != -1) {
                List<String> cycle = new ArrayList<>(path.subList(cycleStart, path.size()));
                cycle.add(node); // close the loop
                cycles.add(cycle);
            }
            return;
        }

        state.put(node, VisitState.VISITING);
        path.add(node);

        Set<String> neighbors = graph.getOrDefault(node, Collections.emptySet());
        for (String neighbor : neighbors) {
            dfs(neighbor, path, state, graph, cycles);
        }

        path.remove(path.size() - 1);
        state.put(node, VisitState.VISITED);
    }

    private enum VisitState {
        UNVISITED, VISITING, VISITED
    }
}
