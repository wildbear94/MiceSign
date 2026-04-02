import type { ComponentType } from 'react';
import GeneralForm from './GeneralForm';
import ExpenseForm from './ExpenseForm';
import LeaveForm from './LeaveForm';
import GeneralReadOnly from './GeneralReadOnly';
import ExpenseReadOnly from './ExpenseReadOnly';
import LeaveReadOnly from './LeaveReadOnly';

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

export const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {
  GENERAL: {
    editComponent: GeneralForm,
    readOnlyComponent: GeneralReadOnly,
    label: '일반 업무 기안',
    description: '일반적인 업무 기안 및 보고에 사용합니다.',
    icon: 'FileText',
  },
  EXPENSE: {
    editComponent: ExpenseForm,
    readOnlyComponent: ExpenseReadOnly,
    label: '지출 결의서',
    description: '지출 내역을 보고하고 승인을 요청합니다.',
    icon: 'Receipt',
  },
  LEAVE: {
    editComponent: LeaveForm,
    readOnlyComponent: LeaveReadOnly,
    label: '휴가 신청서',
    description: '휴가를 신청합니다.',
    icon: 'CalendarDays',
  },
};

export function getTemplateEntry(code: string): TemplateEntry | undefined {
  return TEMPLATE_REGISTRY[code];
}
