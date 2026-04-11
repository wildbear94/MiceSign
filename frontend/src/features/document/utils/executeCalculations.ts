import type { CalculationRule } from '../types/dynamicForm';

/**
 * Safely converts a value to a number. Returns 0 for NaN, null, undefined, or non-numeric strings.
 */
function toSafeNumber(value: unknown): number {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Resolves a dotted field reference against form values.
 *
 * Supports:
 * - Simple fields: "totalAmount" -> formValues.totalAmount
 * - Column references: "items.price" -> sum of `price` column across array field `items`
 */
function resolveFieldValue(ref: string, formValues: Record<string, unknown>): number {
  const dotIndex = ref.indexOf('.');
  if (dotIndex === -1) {
    // Simple field reference
    return toSafeNumber(formValues[ref]);
  }

  // Column reference: "arrayField.column"
  const arrayFieldId = ref.substring(0, dotIndex);
  const columnId = ref.substring(dotIndex + 1);
  const arrayValue = formValues[arrayFieldId];

  if (!Array.isArray(arrayValue)) return 0;

  // Sum the column across all rows
  return arrayValue.reduce((sum: number, row: unknown) => {
    if (row != null && typeof row === 'object') {
      return sum + toSafeNumber((row as Record<string, unknown>)[columnId]);
    }
    return sum;
  }, 0);
}

/**
 * Pattern for SUM(expr) where expr can contain column references like "items.price * items.qty"
 */
const SUM_PATTERN = /^SUM\((.+)\)$/i;

/**
 * Evaluates a SUM formula over array rows.
 *
 * Example: SUM(items.price * items.qty)
 * - Finds all array field references (items.price, items.qty)
 * - Iterates over the array rows and evaluates per-row expression
 * - Returns the sum of all row results
 */
function evaluateSum(innerExpr: string, formValues: Record<string, unknown>): number {
  // Extract dotted references (e.g., "items.price", "items.qty")
  const refPattern = /([a-zA-Z_]\w*\.[a-zA-Z_]\w*)/g;
  const refs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = refPattern.exec(innerExpr)) !== null) {
    refs.push(match[1]);
  }

  if (refs.length === 0) {
    // No column references -- treat as simple arithmetic
    return evaluateArithmetic(innerExpr, formValues);
  }

  // Determine the array field name (all refs should share the same array field)
  const arrayFieldId = refs[0].substring(0, refs[0].indexOf('.'));
  const arrayValue = formValues[arrayFieldId];

  if (!Array.isArray(arrayValue) || arrayValue.length === 0) return 0;

  let total = 0;
  for (const row of arrayValue) {
    if (row == null || typeof row !== 'object') continue;
    const rowRecord = row as Record<string, unknown>;

    // Build expression with row values substituted
    let rowExpr = innerExpr;
    for (const ref of refs) {
      const columnId = ref.substring(ref.indexOf('.') + 1);
      const cellValue = toSafeNumber(rowRecord[columnId]);
      // Replace all occurrences of this ref with the numeric value
      rowExpr = rowExpr.split(ref).join(String(cellValue));
    }

    total += evaluateSimpleArithmetic(rowExpr);
  }

  return Number.isFinite(total) ? total : 0;
}

/**
 * Tokenizes and evaluates a simple arithmetic expression with +, -, *, / operators.
 * Only operates on numeric literals (no variables). Respects operator precedence.
 */
function evaluateSimpleArithmetic(expr: string): number {
  // Remove whitespace
  const cleaned = expr.replace(/\s/g, '');

  try {
    // Tokenize into numbers and operators
    const tokens = tokenize(cleaned);
    const result = parseExpression(tokens, 0);
    return Number.isFinite(result.value) ? result.value : 0;
  } catch {
    return 0;
  }
}

interface Token {
  type: 'number' | 'operator';
  value: string;
}

interface ParseResult {
  value: number;
  pos: number;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (ch === '+' || ch === '*' || ch === '/') {
      tokens.push({ type: 'operator', value: ch });
      i++;
    } else if (ch === '-') {
      // Negative sign if at start or after another operator
      const prev = tokens[tokens.length - 1];
      if (!prev || prev.type === 'operator') {
        // Negative number
        let numStr = '-';
        i++;
        while (i < expr.length && (isDigit(expr[i]) || expr[i] === '.')) {
          numStr += expr[i];
          i++;
        }
        tokens.push({ type: 'number', value: numStr });
      } else {
        tokens.push({ type: 'operator', value: '-' });
        i++;
      }
    } else if (isDigit(ch) || ch === '.') {
      let numStr = '';
      while (i < expr.length && (isDigit(expr[i]) || expr[i] === '.')) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: numStr });
    } else {
      // Skip unknown characters
      i++;
    }
  }

  return tokens;
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/**
 * Recursive descent parser respecting operator precedence: + - then * /
 */
function parseExpression(tokens: Token[], pos: number): ParseResult {
  let result = parseTerm(tokens, pos);

  while (result.pos < tokens.length) {
    const token = tokens[result.pos];
    if (token.type !== 'operator' || (token.value !== '+' && token.value !== '-')) break;

    const right = parseTerm(tokens, result.pos + 1);
    if (token.value === '+') {
      result = { value: result.value + right.value, pos: right.pos };
    } else {
      result = { value: result.value - right.value, pos: right.pos };
    }
  }

  return result;
}

function parseTerm(tokens: Token[], pos: number): ParseResult {
  let result = parseFactor(tokens, pos);

  while (result.pos < tokens.length) {
    const token = tokens[result.pos];
    if (token.type !== 'operator' || (token.value !== '*' && token.value !== '/')) break;

    const right = parseFactor(tokens, result.pos + 1);
    if (token.value === '*') {
      result = { value: result.value * right.value, pos: right.pos };
    } else {
      // Division by zero -> 0
      result = { value: right.value !== 0 ? result.value / right.value : 0, pos: right.pos };
    }
  }

  return result;
}

function parseFactor(tokens: Token[], pos: number): ParseResult {
  if (pos >= tokens.length) return { value: 0, pos };

  const token = tokens[pos];
  if (token.type === 'number') {
    return { value: parseFloat(token.value), pos: pos + 1 };
  }

  // Fallback for unexpected tokens
  return { value: 0, pos: pos + 1 };
}

/**
 * Evaluates a simple arithmetic formula where field references are resolved first.
 *
 * Example: "field1 + field2" -> resolve field1 and field2, then compute sum.
 */
function evaluateArithmetic(formula: string, formValues: Record<string, unknown>): number {
  // Replace field references with their numeric values
  // Match identifiers that could be field names (including dotted references)
  let resolved = formula;
  const fieldRefPattern = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/g;
  const fieldRefs: string[] = [];
  let refMatch: RegExpExecArray | null;
  while ((refMatch = fieldRefPattern.exec(formula)) !== null) {
    fieldRefs.push(refMatch[0]);
  }

  // Sort by length descending to avoid partial replacements
  fieldRefs.sort((a, b) => b.length - a.length);

  for (const ref of fieldRefs) {
    const numValue = resolveFieldValue(ref, formValues);
    resolved = resolved.split(ref).join(String(numValue));
  }

  return evaluateSimpleArithmetic(resolved);
}

/**
 * Executes calculation rules and returns computed values.
 *
 * Supported formula patterns:
 * - SUM(items.price * items.qty) — iterate over array rows, evaluate per-row, sum results
 * - SUM(items.price) — sum a single column across array rows
 * - field1 + field2 — basic arithmetic with field references
 * - field1 * 0.1 — arithmetic with literals
 * - Basic operators: +, -, *, /
 *
 * @returns Map of targetFieldId -> computed numeric value
 */
export function executeCalculations(
  rules: CalculationRule[],
  formValues: Record<string, unknown>,
): Record<string, number> {
  const results: Record<string, number> = {};

  // Create a merged view so that calculations can reference earlier results
  const mergedValues: Record<string, unknown> = { ...formValues };

  for (const rule of rules) {
    const { targetFieldId, formula } = rule;
    let computedValue: number;

    const sumMatch = formula.match(SUM_PATTERN);
    if (sumMatch) {
      computedValue = evaluateSum(sumMatch[1], mergedValues);
    } else {
      computedValue = evaluateArithmetic(formula, mergedValues);
    }

    // Ensure we never return NaN or Infinity
    if (!Number.isFinite(computedValue)) {
      computedValue = 0;
    }

    results[targetFieldId] = computedValue;
    // Feed the result back so subsequent rules can reference it
    mergedValues[targetFieldId] = computedValue;
  }

  return results;
}
