import type { ComponentType } from 'react';
import DynamicCustomForm from '../dynamic/DynamicCustomForm';
import DynamicCustomReadOnly from '../dynamic/DynamicCustomReadOnly';
import GeneralForm from './GeneralForm';
import ExpenseForm from './ExpenseForm';
import LeaveForm from './LeaveForm';
import PurchaseForm from './PurchaseForm';
import BusinessTripForm from './BusinessTripForm';
import OvertimeForm from './OvertimeForm';
import GeneralReadOnly from './GeneralReadOnly';
import ExpenseReadOnly from './ExpenseReadOnly';
import LeaveReadOnly from './LeaveReadOnly';
import PurchaseReadOnly from './PurchaseReadOnly';
import BusinessTripReadOnly from './BusinessTripReadOnly';
import OvertimeReadOnly from './OvertimeReadOnly';

export interface TemplateEditProps {
  documentId: number | null;
  initialData?: {
    title: string;
    bodyHtml?: string;
    formData?: string;
    /** CUSTOM 템플릿 전용 — DocumentDetailResponse.schemaDefinitionSnapshot 값 (JSON string) */
    schemaSnapshot?: string | null;
  };
  onSave: (data: { title: string; bodyHtml?: string; formData?: string }) => Promise<void>;
  readOnly?: boolean;
}

export interface TemplateReadOnlyProps {
  title: string;
  bodyHtml?: string | null;
  formData?: string | null;
  /** CUSTOM 템플릿 전용 — DocumentDetailResponse.schemaDefinitionSnapshot 값 (JSON string) */
  schemaSnapshot?: string | null;
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
  PURCHASE: {
    editComponent: PurchaseForm,
    readOnlyComponent: PurchaseReadOnly,
    label: '구매 요청서',
    description: '물품 및 서비스 구매를 요청합니다.',
    icon: 'ShoppingCart',
  },
  BUSINESS_TRIP: {
    editComponent: BusinessTripForm,
    readOnlyComponent: BusinessTripReadOnly,
    label: '출장 보고서',
    description: '출장 일정과 경비를 보고합니다.',
    icon: 'Plane',
  },
  OVERTIME: {
    editComponent: OvertimeForm,
    readOnlyComponent: OvertimeReadOnly,
    label: '연장 근무 신청서',
    description: '연장 근무를 신청합니다.',
    icon: 'Clock',
  },
};

export function getTemplateEntry(code: string): TemplateEntry | undefined {
  return TEMPLATE_REGISTRY[code];
}

/**
 * Phase 24.1-04: CUSTOM (사용자 정의) 양식 fallback 렌더러.
 *
 * D-01/D-03 — TEMPLATE_REGISTRY lookup 이 실패했을 때 DocumentEditorPage /
 * DocumentDetailPage 가 이 두 컴포넌트로 fallback 한다. 하드코딩 6개 템플릿은
 * 여전히 TEMPLATE_REGISTRY 로 분기되므로 영향 없음.
 */
export const DYNAMIC_CUSTOM_EDIT = DynamicCustomForm;
export const DYNAMIC_CUSTOM_READONLY = DynamicCustomReadOnly;

/**
 * CUSTOM 템플릿 fallback 판정.
 *
 * - `hasSnapshot=true` (편집/조회 시 schemaDefinitionSnapshot 존재): 과거 문서가
 *   스냅샷을 가지고 있으면 templateCode 가 하드코딩이어도 CUSTOM 취급하여 스냅샷 기반 렌더.
 * - 신규 작성 (`hasSnapshot=false`): TEMPLATE_REGISTRY 미등록 코드일 때 CUSTOM fallback.
 */
export function isCustomTemplate(
  templateCode: string | undefined,
  hasSnapshot = false,
): boolean {
  if (hasSnapshot) return true;
  if (!templateCode) return false;
  return !(templateCode in TEMPLATE_REGISTRY);
}
