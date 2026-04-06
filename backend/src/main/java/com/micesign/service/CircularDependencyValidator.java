package com.micesign.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * DFS 3-color 알고리즘으로 조건부/계산 규칙의 순환 의존성을 검출한다.
 * 프론트엔드 detectCircularDeps.ts와 동일한 로직을 Java로 구현 (D-16).
 */
@Component
public class CircularDependencyValidator {

    /**
     * schemaDefinition JSON 문자열에서 conditionalRules와 calculationRules를 추출하여
     * 순환 의존성을 검사한다.
     *
     * @param schemaJson schemaDefinition JSON 문자열
     * @param objectMapper JSON 파서
     * @return 순환 경로 (필드 ID 리스트). 순환 없으면 Optional.empty()
     */
    @SuppressWarnings("unchecked")
    public Optional<List<String>> detectCycle(String schemaJson, ObjectMapper objectMapper) {
        if (schemaJson == null || schemaJson.isBlank()) return Optional.empty();

        try {
            Map<String, Object> schema = objectMapper.readValue(schemaJson, Map.class);

            Map<String, Set<String>> graph = new HashMap<>();

            // Build graph from conditionalRules
            List<Map<String, Object>> conditionalRules =
                (List<Map<String, Object>>) schema.getOrDefault("conditionalRules", List.of());
            for (Map<String, Object> rule : conditionalRules) {
                String target = (String) rule.get("targetFieldId");
                List<Map<String, Object>> conditions =
                    (List<Map<String, Object>>) rule.getOrDefault("conditions", List.of());
                for (Map<String, Object> cond : conditions) {
                    String source = (String) cond.get("sourceFieldId");
                    graph.computeIfAbsent(source, k -> new HashSet<>()).add(target);
                }
            }

            // Build graph from calculationRules
            List<Map<String, Object>> calculationRules =
                (List<Map<String, Object>>) schema.getOrDefault("calculationRules", List.of());
            for (Map<String, Object> rule : calculationRules) {
                String target = (String) rule.get("targetFieldId");
                List<String> sourceFields =
                    (List<String>) rule.getOrDefault("sourceFields", List.of());
                for (String source : sourceFields) {
                    graph.computeIfAbsent(source, k -> new HashSet<>()).add(target);
                }
            }

            if (graph.isEmpty()) return Optional.empty();

            // DFS 3-color: 0=WHITE, 1=GRAY, 2=BLACK
            Map<String, Integer> color = new HashMap<>();
            Map<String, String> parent = new HashMap<>();

            for (String node : graph.keySet()) {
                if (color.getOrDefault(node, 0) == 0) {
                    List<String> cycle = dfs(node, graph, color, parent);
                    if (cycle != null) return Optional.of(cycle);
                }
            }
            return Optional.empty();

        } catch (Exception e) {
            // JSON parsing failure — treat as no cycle (validation error handled elsewhere)
            return Optional.empty();
        }
    }

    private List<String> dfs(
        String node,
        Map<String, Set<String>> graph,
        Map<String, Integer> color,
        Map<String, String> parent
    ) {
        color.put(node, 1); // GRAY
        for (String neighbor : graph.getOrDefault(node, Set.of())) {
            Integer neighborColor = color.getOrDefault(neighbor, 0);
            if (neighborColor == 1) {
                // Cycle found — reconstruct path
                List<String> path = new ArrayList<>();
                path.add(neighbor);
                String curr = node;
                while (!curr.equals(neighbor)) {
                    path.add(curr);
                    curr = parent.getOrDefault(curr, neighbor);
                }
                path.add(neighbor);
                Collections.reverse(path);
                return path;
            }
            if (neighborColor == 0) {
                parent.put(neighbor, node);
                List<String> cycle = dfs(neighbor, graph, color, parent);
                if (cycle != null) return cycle;
            }
        }
        color.put(node, 2); // BLACK
        return null;
    }
}
