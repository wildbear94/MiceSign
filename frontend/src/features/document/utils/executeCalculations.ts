import type { CalculationRule } from '../types/dynamicForm';

/**
 * 소스 필드에서 숫자 값 배열 추출
 * - 단순 필드: formValues[fieldId]를 숫자로 변환
 * - 테이블.컬럼: formValues[tableId]가 배열이면 각 행의 colId 값 추출
 */
function extractValues(
  sourceField: string,
  formValues: Record<string, unknown>,
): number[] {
  if (sourceField.includes('.')) {
    const dotIndex = sourceField.indexOf('.');
    const tableId = sourceField.substring(0, dotIndex);
    const colId = sourceField.substring(dotIndex + 1);
    const tableData = formValues[tableId];

    if (!Array.isArray(tableData)) return [];

    return tableData.map((row: Record<string, unknown>) => {
      const val = Number(row?.[colId]);
      return isNaN(val) ? 0 : val;
    });
  }

  const val = Number(formValues[sourceField]);
  return [isNaN(val) ? 0 : val];
}

/**
 * 계산 규칙을 실행하여 결과값 반환
 *
 * - SUM/ADD: 모든 소스 값의 합계
 * - MULTIPLY: 모든 소스 값의 곱
 * - COUNT: 소스 값의 개수
 *
 * 결과는 소수점 2자리로 반올림
 */
export function executeCalculation(
  rule: CalculationRule,
  formValues: Record<string, unknown>,
): number {
  const allValues: number[] = [];

  for (const sourceField of rule.sourceFields) {
    allValues.push(...extractValues(sourceField, formValues));
  }

  let result: number;

  switch (rule.operation) {
    case 'SUM':
    case 'ADD':
      result = allValues.reduce((a, b) => a + b, 0);
      break;
    case 'MULTIPLY':
      result = allValues.reduce((a, b) => a * b, 1);
      break;
    case 'COUNT':
      result = allValues.length;
      break;
    default:
      result = 0;
  }

  return Math.round(result * 100) / 100;
}
