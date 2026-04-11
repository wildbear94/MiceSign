export function toFieldId(label: string): string {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
    .replace(/\s+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/\s/g, '')
    .replace(/^(.)/, (_, c: string) => c.toLowerCase());
}
