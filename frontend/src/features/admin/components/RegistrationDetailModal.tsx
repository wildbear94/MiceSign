import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import ConfirmDialog from './ConfirmDialog';
import { useApproveRegistration, useRejectRegistration } from '../hooks/useRegistrations';
import type { RegistrationListItem, DepartmentTreeNode, PositionItem, RegistrationStatus } from '../../../types/admin';
import type { ApiResponse } from '../../../types/api';

interface RegistrationDetailModalProps {
  registration: RegistrationListItem | null;
  onClose: () => void;
  departments: DepartmentTreeNode[];
  positions: PositionItem[];
}

const REG_STATUS_BADGE: Record<RegistrationStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXPIRED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

/** Flatten a department tree into a flat list for select options */
function flattenDepartments(nodes: DepartmentTreeNode[]): { id: number; name: string }[] {
  const result: { id: number; name: string }[] = [];
  function walk(list: DepartmentTreeNode[]) {
    for (const node of list) {
      if (node.isActive) {
        result.push({ id: node.id, name: node.name });
      }
      walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function RegistrationDetailModal({
  registration,
  onClose,
  departments,
  positions,
}: RegistrationDetailModalProps) {
  const { t } = useTranslation('admin');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Mode: view (default, shows approve form) or reject (shows reject form)
  const [mode, setMode] = useState<'view' | 'reject'>('view');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Approve form state
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [positionId, setPositionId] = useState<number | ''>('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [approveErrors, setApproveErrors] = useState<Record<string, string>>({});

  // Reject form state
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const approveMutation = useApproveRegistration();
  const rejectMutation = useRejectRegistration();

  // Reset state when registration changes
  useEffect(() => {
    setMode('view');
    setDepartmentId('');
    setPositionId('');
    setEmployeeNo('');
    setApproveErrors({});
    setRejectionReason('');
    setRejectError('');
    setShowRejectConfirm(false);
  }, [registration]);

  // Escape key to close
  useEffect(() => {
    if (!registration) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [registration, onClose]);

  // Focus trap
  useEffect(() => {
    if (!registration || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    firstFocusable?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }
    dialog.addEventListener('keydown', handleTab);
    return () => dialog.removeEventListener('keydown', handleTab);
  }, [registration]);

  if (!registration) return null;

  const flatDepts = flattenDepartments(departments);
  const activePositions = positions.filter((p) => p.isActive);

  const inputClass =
    'w-full h-11 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600';
  const labelClass = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1';

  function validateApproveForm(): boolean {
    const errors: Record<string, string> = {};
    if (departmentId === '') {
      errors.departmentId = t('registration.validation.departmentRequired');
    }
    if (positionId === '') {
      errors.positionId = t('registration.validation.positionRequired');
    }
    if (!employeeNo.trim()) {
      errors.employeeNo = t('registration.validation.employeeNoRequired');
    }
    setApproveErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleError(err: unknown) {
    const axiosError = err as AxiosError<ApiResponse<null>>;
    const errorCode = axiosError.response?.data?.error?.code;
    if (errorCode === 'REGISTRATION_ALREADY_PROCESSED' || axiosError.response?.status === 409) {
      toast.error(t('registration.toast.alreadyProcessed'));
    } else {
      toast.error(t('registration.toast.error'));
    }
  }

  async function handleApprove() {
    if (!validateApproveForm()) return;
    try {
      await approveMutation.mutateAsync({
        id: registration!.id,
        data: { employeeNo: employeeNo.trim(), departmentId: Number(departmentId), positionId: Number(positionId) },
      });
      toast.success(t('registration.toast.approved'));
      onClose();
    } catch (err) {
      handleError(err);
    }
  }

  function handleRejectConfirm() {
    if (rejectionReason.length < 10) {
      setRejectError(t('registration.validation.rejectionReasonMinLength'));
      return;
    }
    setRejectError('');
    setShowRejectConfirm(true);
  }

  async function handleReject() {
    try {
      await rejectMutation.mutateAsync({
        id: registration!.id,
        data: { rejectionReason },
      });
      toast.success(t('registration.toast.rejected'));
      setShowRejectConfirm(false);
      onClose();
    } catch (err) {
      setShowRejectConfirm(false);
      handleError(err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-detail-modal-title"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-[500px] w-full mx-4 p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="reg-detail-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-50"
          >
            {t('registration.modal.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Applicant info section (all statuses, per D-09) */}
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {t('registration.table.name')}
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">{registration.name}</span>

          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {t('registration.table.email')}
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">{registration.email}</span>

          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {t('registration.table.createdAt')}
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {formatDate(registration.createdAt)}
          </span>

          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {t('registration.table.status')}
          </span>
          <span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${REG_STATUS_BADGE[registration.status] ?? ''}`}
            >
              {t(`registration.status.${registration.status}`)}
            </span>
          </span>
        </div>

        {/* PENDING action section (per D-10, D-12 through D-21) */}
        {registration.status === 'PENDING' && (
          <>
            <hr className="my-4 border-gray-200 dark:border-gray-700" />

            {mode === 'view' ? (
              <>
                {/* Approve form */}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="reg-department" className={labelClass}>
                      {t('registration.modal.department')}
                    </label>
                    <select
                      id="reg-department"
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                      className={inputClass}
                    >
                      <option value="">부서를 선택해주세요</option>
                      {flatDepts.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    {approveErrors.departmentId && (
                      <p className="text-xs text-red-600 mt-1">{approveErrors.departmentId}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reg-position" className={labelClass}>
                      {t('registration.modal.position')}
                    </label>
                    <select
                      id="reg-position"
                      value={positionId}
                      onChange={(e) => setPositionId(e.target.value ? Number(e.target.value) : '')}
                      className={inputClass}
                    >
                      <option value="">직급을 선택해주세요</option>
                      {activePositions.map((pos) => (
                        <option key={pos.id} value={pos.id}>{pos.name}</option>
                      ))}
                    </select>
                    {approveErrors.positionId && (
                      <p className="text-xs text-red-600 mt-1">{approveErrors.positionId}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reg-employeeNo" className={labelClass}>
                      {t('registration.modal.employeeNo')}
                    </label>
                    <input
                      id="reg-employeeNo"
                      type="text"
                      maxLength={20}
                      placeholder="예: EMP001"
                      value={employeeNo}
                      onChange={(e) => setEmployeeNo(e.target.value)}
                      className={inputClass}
                    />
                    {approveErrors.employeeNo && (
                      <p className="text-xs text-red-600 mt-1">{approveErrors.employeeNo}</p>
                    )}
                  </div>
                </div>

                {/* Button row (per D-15, D-18) */}
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="flex-1 h-11 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {approveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('registration.action.approve')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('reject')}
                    disabled={approveMutation.isPending}
                    className="flex-1 h-11 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  >
                    {t('registration.action.reject')}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Reject form (per D-18, D-19) */}
                <textarea
                  className="w-full min-h-[80px] px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 mt-4"
                  placeholder={t('registration.modal.rejectionReasonPlaceholder')}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectError && e.target.value.length >= 10) {
                      setRejectError('');
                    }
                  }}
                />
                {rejectionReason.length > 0 && rejectionReason.length < 10 && (
                  <p className="text-xs text-red-600 mt-1">
                    {t('registration.validation.rejectionReasonMinLength')}
                  </p>
                )}
                {rejectError && rejectionReason.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">{rejectError}</p>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('view');
                      setRejectionReason('');
                      setRejectError('');
                    }}
                    className="flex-1 h-11 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {t('registration.action.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectConfirm}
                    disabled={rejectionReason.length < 10}
                    className="flex-1 h-11 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  >
                    {t('registration.action.confirmReject')}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* APPROVED read-only section (per D-11) */}
        {registration.status === 'APPROVED' && (
          <>
            <hr className="my-4 border-gray-200 dark:border-gray-700" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
              {t('registration.modal.assignInfo')}
            </h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {t('registration.modal.employeeNo')}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-50">
                {registration.employeeNo ?? '-'}
              </span>

              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {t('registration.modal.department')}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-50">
                {registration.departmentName ?? '-'}
              </span>

              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {t('registration.modal.position')}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-50">
                {registration.positionName ?? '-'}
              </span>

              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {t('registration.table.processedAt')}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-50">
                {registration.processedAt ? formatDate(registration.processedAt) : '-'}
              </span>
            </div>
          </>
        )}

        {/* REJECTED read-only section (per D-11) */}
        {registration.status === 'REJECTED' && (
          <>
            <hr className="my-4 border-gray-200 dark:border-gray-700" />
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {t('registration.modal.rejectionReason')}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-50">
                {registration.rejectionReason ?? '-'}
              </span>

              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {t('registration.table.processedAt')}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-50">
                {registration.processedAt ? formatDate(registration.processedAt) : '-'}
              </span>
            </div>
          </>
        )}

        {/* ConfirmDialog for reject (per D-20) */}
        <ConfirmDialog
          open={showRejectConfirm}
          onClose={() => setShowRejectConfirm(false)}
          onConfirm={handleReject}
          title={t('registration.action.rejectConfirmTitle')}
          message={t('registration.action.rejectConfirmMessage')}
          confirmLabel={t('registration.action.confirmReject')}
          confirmVariant="danger"
          isLoading={rejectMutation.isPending}
        />
      </div>
    </div>
  );
}
