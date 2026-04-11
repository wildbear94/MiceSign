import type { CalculationRule } from '../types/dynamicForm';

/**
 * Detects circular dependencies in calculation rules.
 *
 * Builds a dependency graph from rules where each `targetFieldId` depends on
 * the fields listed in `dependsOn`. Uses iterative DFS to find all cycles.
 *
 * @returns Array of cycles found. Each cycle is an array of field IDs forming the loop.
 *          Empty array means no circular dependencies exist.
 */
export function detectCircularDeps(rules: CalculationRule[]): string[][] {
  // Build adjacency list: targetFieldId -> dependsOn fields
  // But for cycle detection, the edge direction is: targetFieldId depends on dependsOn,
  // meaning dependsOn fields must be computed first. A cycle exists if A depends on B
  // and B (transitively) depends on A.
  // Graph: targetFieldId -> set of fields it depends on
  const graph = new Map<string, Set<string>>();

  for (const rule of rules) {
    const deps = graph.get(rule.targetFieldId) ?? new Set<string>();
    for (const dep of rule.dependsOn) {
      deps.add(dep);
    }
    graph.set(rule.targetFieldId, deps);
  }

  const allNodes = new Set<string>(graph.keys());
  const cycles: string[][] = [];

  // Track visited state for DFS: 'unvisited' | 'visiting' | 'visited'
  const state = new Map<string, 'unvisited' | 'visiting' | 'visited'>();
  for (const node of allNodes) {
    state.set(node, 'unvisited');
  }

  // DFS with path tracking to find all cycles
  function dfs(node: string, path: string[]): void {
    const nodeState = state.get(node);
    if (nodeState === 'visited') return;

    if (nodeState === 'visiting') {
      // Found a cycle -- extract it from the path
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart);
        cycle.push(node); // close the loop
        cycles.push(cycle);
      }
      return;
    }

    state.set(node, 'visiting');
    path.push(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        dfs(neighbor, path);
      }
    }

    path.pop();
    state.set(node, 'visited');
  }

  for (const node of allNodes) {
    if (state.get(node) === 'unvisited') {
      dfs(node, []);
    }
  }

  return cycles;
}
