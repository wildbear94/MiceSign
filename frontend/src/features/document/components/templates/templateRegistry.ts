import type { ComponentType } from 'react';

export interface TemplateEditProps {
  documentId: number | null;
  initialData?: { title: string; bodyHtml?: string; formData?: string };
  onSave: (data: { title: string; bodyHtml?: string; formData?: string }) => Promise<void>;
  readOnly?: boolean;
}

export interface TemplateReadOnlyProps {
  title: string;
  bodyHtml?: string | null;
  formData?: string | null;
}

export interface TemplateEntry {
  editComponent: ComponentType<TemplateEditProps>;
  readOnlyComponent: ComponentType<TemplateReadOnlyProps>;
  label: string;
  description: string;
  icon: string; // lucide-react icon name
}

// Placeholder - actual components will be imported in Plan 03
// For now, export the type and a function to register
export const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {};

export function getTemplateEntry(code: string): TemplateEntry | undefined {
  return TEMPLATE_REGISTRY[code];
}
