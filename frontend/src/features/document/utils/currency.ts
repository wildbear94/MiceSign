const formatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return formatter.format(value);
}

export function parseNumericInput(value: string): number {
  return parseInt(value.replace(/\D/g, ''), 10) || 0;
}
