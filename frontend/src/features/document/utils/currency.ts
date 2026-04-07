// ---------------------------------------------------------------------------
// Korean Won currency formatting utilities
// ---------------------------------------------------------------------------

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('ko-KR');

/**
 * Format a number as Korean Won currency (e.g. "₩1,234,567").
 */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/**
 * Format a number with thousands separators and append "원"
 * (e.g. "1,234,567원").
 */
export function formatCurrencyWithUnit(amount: number): string {
  return `${numberFormatter.format(amount)}원`;
}

/**
 * Format a number with thousands separators only (e.g. "1,234,567").
 */
export function formatNumber(amount: number): string {
  return numberFormatter.format(amount);
}

/**
 * Parse a numeric string that may contain commas or currency symbols
 * into a plain number. Returns 0 for unparseable input.
 */
export function parseNumericInput(value: string): number {
  return parseInt(value.replace(/\D/g, ''), 10) || 0;
}
