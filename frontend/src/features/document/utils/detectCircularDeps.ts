import type { ConditionalRule, CalculationRule } from '../types/dynamicForm';

const WHITE = 0;
const GRAY = 1;
const BLACK = 2;

/**
 * 조건부/계산 규칙에서 순환 의존성 감지 (DFS 3-color 알고리즘)
 *
 * 방향 그래프 구성:
 * - 조건부 규칙: source -> target (조건의 소스 필드가 타겟 필드에 영향)
 * - 계산 규칙: source -> target (소스 필드가 타겟 필드에 값 제공)
 *
 * @returns 순환 경로 (필드 ID 배열) 또는 순환 없으면 null
 */
export function detectCircularDeps(
  conditionalRules: ConditionalRule[],
  calculationRules: CalculationRule[],
): string[] | null {
  // 방향 그래프 구성: source -> Set<target>
  const graph = new Map<string, Set<string>>();
  const allNodes = new Set<string>();

  function addEdge(from: string, to: string) {
    allNodes.add(from);
    allNodes.add(to);
    if (!graph.has(from)) graph.set(from, new Set());
    graph.get(from)!.add(to);
  }

  // 조건부 규칙: 각 조건의 sourceFieldId -> targetFieldId
  for (const rule of conditionalRules) {
    for (const condition of rule.conditions) {
      addEdge(condition.sourceFieldId, rule.targetFieldId);
    }
  }

  // 계산 규칙: 각 sourceField -> targetFieldId
  for (const rule of calculationRules) {
    for (const sf of rule.sourceFields) {
      // table.column의 경우 테이블 ID만 사용
      const fieldId = sf.includes('.') ? sf.split('.')[0] : sf;
      addEdge(fieldId, rule.targetFieldId);
    }
  }

  if (allNodes.size === 0) return null;

  // DFS 3-color
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const node of allNodes) {
    color.set(node, WHITE);
  }

  for (const startNode of allNodes) {
    if (color.get(startNode) !== WHITE) continue;

    const cycle = dfs(startNode, graph, color, parent);
    if (cycle) return cycle;
  }

  return null;
}

function dfs(
  node: string,
  graph: Map<string, Set<string>>,
  color: Map<string, number>,
  parent: Map<string, string | null>,
): string[] | null {
  color.set(node, GRAY);

  const neighbors = graph.get(node);
  if (neighbors) {
    for (const neighbor of neighbors) {
      if (color.get(neighbor) === GRAY) {
        // 순환 발견 - 경로 재구성
        return reconstructCycle(node, neighbor, parent);
      }
      if (color.get(neighbor) === WHITE) {
        parent.set(neighbor, node);
        const cycle = dfs(neighbor, graph, color, parent);
        if (cycle) return cycle;
      }
    }
  }

  color.set(node, BLACK);
  return null;
}

/**
 * GRAY 노드에서 순환 경로 재구성
 */
function reconstructCycle(
  current: string,
  cycleStart: string,
  parent: Map<string, string | null>,
): string[] {
  const path: string[] = [cycleStart];
  let node: string | null | undefined = current;

  while (node && node !== cycleStart) {
    path.push(node);
    node = parent.get(node);
  }

  path.push(cycleStart);
  path.reverse();
  return path;
}
