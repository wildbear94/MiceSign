import {
  templateImportSchema,
  type TemplateImportData,
} from '../validations/templateImportSchema';

/**
 * Phase 26 Plan 01 — Preset Registry (D-12~D-15, CNV-04)
 *
 * Loads all `./*.json` files at build time via Vite's eager glob import.
 * Each preset is validated at module load with templateImportSchema — a
 * malformed preset will throw immediately, surfacing the bug in dev/CI
 * rather than at runtime in an admin modal (T-26-04 mitigation).
 */

const modules = import.meta.glob<{ default: unknown }>('./*.json', {
  eager: true,
});

export interface Preset {
  key: string;
  data: TemplateImportData;
}

export const presets: Preset[] = Object.entries(modules)
  .map(([path, mod]) => {
    const key = path.replace(/^\.\/(.*)\.json$/, '$1');
    const parsed = templateImportSchema.parse(mod.default);
    return { key, data: parsed };
  })
  .sort((a, b) => a.key.localeCompare(b.key));
