import { lazy, type ComponentType } from 'react';

// ---------------------------------------------------------------------------
// Prop interfaces for template form components
// ---------------------------------------------------------------------------

/**
 * Props for editable template form components.
 * Title is handled by the parent (DocumentEditorPage), not by the form.
 */
export interface TemplateFormProps {
  /** JSON string of form-specific data (parsed internally) */
  formData: string | null;
  /** HTML body content (used by GENERAL template) */
  bodyHtml: string | null;
  /** Callback fired whenever the form data changes */
  onChange: (data: { formData?: string; bodyHtml?: string }) => void;
  /** When true, all inputs become read-only */
  disabled?: boolean;
}

/**
 * Props for read-only template display components.
 */
export interface TemplateReadOnlyProps {
  formData: string | null;
  bodyHtml: string | null;
}

// ---------------------------------------------------------------------------
// Registry entry
// ---------------------------------------------------------------------------

interface TemplateRegistryEntry {
  form: ComponentType<TemplateFormProps>;
  readOnly: ComponentType<TemplateReadOnlyProps>;
  label: string;
}

// ---------------------------------------------------------------------------
// Lazy imports for code splitting
// ---------------------------------------------------------------------------

const TEMPLATE_REGISTRY: Record<string, TemplateRegistryEntry> = {
  GENERAL: {
    form: lazy(() => import('./GeneralForm')),
    readOnly: lazy(() => import('./GeneralReadOnly')),
    label: '일반 업무 기안',
  },
  EXPENSE: {
    form: lazy(() => import('./ExpenseForm')),
    readOnly: lazy(() => import('./ExpenseReadOnly')),
    label: '지출 결의서',
  },
  LEAVE: {
    form: lazy(() => import('./LeaveForm')),
    readOnly: lazy(() => import('./LeaveReadOnly')),
    label: '휴가 신청서',
  },
  PURCHASE: {
    form: lazy(() => import('./PurchaseForm')),
    readOnly: lazy(() => import('./PurchaseReadOnly')),
    label: '구매 요청서',
  },
  BUSINESS_TRIP: {
    form: lazy(() => import('./BusinessTripForm')),
    readOnly: lazy(() => import('./BusinessTripReadOnly')),
    label: '출장 보고서',
  },
  OVERTIME: {
    form: lazy(() => import('./OvertimeForm')),
    readOnly: lazy(() => import('./OvertimeReadOnly')),
    label: '초과근무 신청서',
  },
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function getTemplateEntry(code: string): TemplateRegistryEntry | null {
  return TEMPLATE_REGISTRY[code] ?? null;
}

export function isHardcodedTemplate(code: string): boolean {
  return code in TEMPLATE_REGISTRY;
}

export { TEMPLATE_REGISTRY };
