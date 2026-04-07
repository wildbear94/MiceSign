import type { CalculationRule, ConditionalRule } from '../types/dynamicForm';

type Graph = Map<string, Set<string>>;

// ---------------------------------------------------------------------------
// Build a directed dependency graph from conditional + calculation rules.
// An edge from A -> B means "A depends on B" (B is a source for A).
// ---------------------------------------------------------------------------

function buildDependencyGraph(
  conditionalRules: ConditionalRule[],
  calculationRules: CalculationRule[],
): Graph {
  const graph: Graph = new Map();

  const ensureNode = (id: string) => {
    if (!graph.has(id)) graph.set(id, new Set());
  };

  // Conditional rules: target depends on each source
  for (const rule of conditionalRules) {
    ensureNode(rule.targetFieldId);
    for (const condition of rule.conditions) {
      ensureNode(condition.sourceFieldId);
      graph.get(rule.targetFieldId)!.add(condition.sourceFieldId);
    }
  }

  // Calculation rules: target depends on each source
  for (const rule of calculationRules) {
    ensureNode(rule.targetFieldId);
    for (const sourceField of rule.sourceFields) {
      // Strip table column suffix (e.g. "items.amount" -> "items")
      const baseField = sourceField.includes('.')
        ? sourceField.split('.')[0]
        : sourceField;
      ensureNode(baseField);
      graph.get(rule.targetFieldId)!.add(baseField);
    }
  }

  return graph;
}

// ---------------------------------------------------------------------------
// DFS-based cycle detection
// ---------------------------------------------------------------------------

/**
 * Detect circular dependencies among conditional and calculation rules.
 *
 * @returns An array of field IDs forming the cycle (e.g. ["a", "b", "c", "a"]),
 *          or `null` if no cycle exists.
 */
export function detectCircularDeps(
  conditionalRules: ConditionalRule[],
  calculationRules: CalculationRule[],
): string[] | null {
  const graph = buildDependencyGraph(conditionalRules, calculationRules);

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const parent = new Map<string, string>();

  function dfs(node: string): string[] | null {
    visited.add(node);
    inStack.add(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (inStack.has(neighbor)) {
          // Found a cycle -- reconstruct the path
          const cycle: string[] = [neighbor];
          let current = node;
          while (current !== neighbor) {
            cycle.push(current);
            current = parent.get(current) ?? neighbor;
          }
          cycle.push(neighbor); // close the loop
          cycle.reverse();
          return cycle;
        }

        if (!visited.has(neighbor)) {
          parent.set(neighbor, node);
          const result = dfs(neighbor);
          if (result) return result;
        }
      }
    }

    inStack.delete(node);
    return null;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      const cycle = dfs(node);
      if (cycle) return cycle;
    }
  }

  return null;
}
