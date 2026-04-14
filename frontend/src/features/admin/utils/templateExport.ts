import type { TemplateDetailItem } from '../api/templateApi';

/**
 * Phase 26 Plan 01 — Template Export Utilities (D-05, D-06, D-07)
 *
 * Pure serializer (no DOM) + filename builder + Blob download trigger.
 * The D-05 payload format intentionally excludes `code`, `id`, `createdBy`,
 * `createdAt`, `isActive` (T-26-06: info disclosure mitigation).
 */

export interface ExportPayload {
  exportFormatVersion: 1;
  schemaVersion: number;
  name: string;
  description?: string;
  prefix: string;
  category?: string;
  icon?: string;
  schemaDefinition: unknown;
}

export function buildExportPayload(detail: TemplateDetailItem): ExportPayload {
  const payload: ExportPayload = {
    exportFormatVersion: 1 as const,
    schemaVersion: detail.schemaVersion,
    name: detail.name,
    prefix: detail.prefix,
    schemaDefinition: detail.schemaDefinition
      ? JSON.parse(detail.schemaDefinition)
      : { version: 1, fields: [] },
  };
  if (detail.description) payload.description = detail.description;
  if (detail.category) payload.category = detail.category;
  if (detail.icon) payload.icon = detail.icon;
  return payload;
}

/**
 * Builds an export filename of the form `{code}-YYYYMMDD.json`.
 * The `code` is sanitized via `[^a-zA-Z0-9_-] → _` (Pitfall 5: path traversal / OS reserved chars).
 */
export function buildExportFilename(code: string, date: Date = new Date()): string {
  const safe = code.replace(/[^a-zA-Z0-9_-]/g, '_');
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${safe}-${yyyy}${mm}${dd}.json`;
}

/**
 * Triggers a browser download of the serialized template JSON.
 * Uses Blob + object URL + synthetic anchor click; revokes URL after click.
 */
export function downloadTemplateJson(detail: TemplateDetailItem): void {
  const payload = buildExportPayload(detail);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = buildExportFilename(detail.code);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
