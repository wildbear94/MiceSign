import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import AutoSaveIndicator from '../components/AutoSaveIndicator';
import FileAttachmentArea from '../components/attachment/FileAttachmentArea';
import ConfirmDialog from '../../admin/components/ConfirmDialog';
import {
  TEMPLATE_REGISTRY,
  DYNAMIC_CUSTOM_EDIT,
  isCustomTemplate,
} from '../components/templates/templateRegistry';
import ApprovalLineEditor, {
  toApprovalLineRequests,
  toApprovalLineItems,
} from '../../approval/components/ApprovalLineEditor';
import { useAuthStore } from '../../../stores/authStore';
import type { ApprovalLineItem } from '../../approval/types/approval';
import {
  useDocumentDetail,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  useSubmitDocument,
} from '../hooks/useDocuments';
import { useAutoSave } from '../hooks/useAutoSave';

export default function DocumentEditorPage() {
  const { t } = useTranslation('document');
  const { t: tApproval } = useTranslation('approval');
  const currentUserId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();
  const { templateCode, id } = useParams<{
    templateCode?: string;
    id?: string;
  }>();

  const documentId = id ? Number(id) : null;
  const isEditMode = documentId !== null;

  // Track the saved document ID (starts null for new, set after first save)
  const [savedDocId, setSavedDocId] = useState<number | null>(documentId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [uploadState, setUploadState] = useState<{ isUploading: boolean; hasError: boolean }>({ isUploading: false, hasError: false });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approvalLines, setApprovalLines] = useState<ApprovalLineItem[]>([]);
  const [approvalLineError, setApprovalLineError] = useState<string | null>(null);

  // For new docs, use templateCode from URL; for edits, from loaded document
  const { data: existingDoc } = useDocumentDetail(documentId);
  const resolvedTemplateCode = templateCode ?? existingDoc?.templateCode ?? '';

  const createMutation = useCreateDocument();
  const updateMutation = useUpdateDocument();
  const deleteMutation = useDeleteDocument();
  const submitMutation = useSubmitDocument();

  // Initialize approval lines from existing document (e.g., resubmitted draft)
  useEffect(() => {
    if (existingDoc?.approvalLines && existingDoc.approvalLines.length > 0) {
      setApprovalLines(toApprovalLineItems(existingDoc.approvalLines));
    }
  }, [existingDoc]);

  // Store the latest form data for auto-save
  const formDataRef = useRef<{
    title: string;
    bodyHtml?: string;
    formData?: string;
  }>({ title: '' });

  const handleSave = useCallback(
    async (data: { title: string; bodyHtml?: string; formData?: string }) => {
      formDataRef.current = data;
      setErrorMessage(null);

      try {
        if (savedDocId) {
          // Update existing — D-30: always send approvalLines: null during auto-save/manual save
          await updateMutation.mutateAsync({
            id: savedDocId,
            data: {
              title: data.title,
              bodyHtml: data.bodyHtml ?? null,
              formData: data.formData ?? null,
              approvalLines: null,
            },
          });
        } else {
          // Create new — D-30: approvalLines: null during draft creation
          const created = await createMutation.mutateAsync({
            templateCode: resolvedTemplateCode,
            title: data.title,
            bodyHtml: data.bodyHtml ?? null,
            formData: data.formData ?? null,
            approvalLines: null,
          });
          setSavedDocId(created.id);
          // Update URL without re-rendering
          window.history.replaceState(null, '', `/documents/${created.id}`);
        }
      } catch {
        setErrorMessage(t('error.saveFailed'));
        throw new Error('save failed');
      }
    },
    [savedDocId, resolvedTemplateCode, createMutation, updateMutation, t],
  );

  // Auto-save: triggered when form data changes
  const autoSaveFn = useCallback(async () => {
    if (formDataRef.current.title) {
      await handleSave(formDataRef.current);
    }
  }, [handleSave]);

  const { status: autoSaveStatus, saveNow } = useAutoSave(
    autoSaveFn,
    [formDataRef.current],
    30000,
  );

  const handleManualSave = useCallback(async () => {
    // Trigger the form's submit which calls onSave
    const form = document.getElementById('document-form') as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!savedDocId) return;
    try {
      await deleteMutation.mutateAsync(savedDocId);
      navigate('/documents/my');
    } catch {
      setErrorMessage(t('error.deleteFailed'));
    }
  }, [savedDocId, deleteMutation, navigate, t]);

  const handleSubmitClick = useCallback(() => {
    setErrorMessage(null);
    setApprovalLineError(null);

    // D-14: block if upload has failed files
    if (uploadState.hasError) {
      setErrorMessage(t('error.uploadFailed'));
      return;
    }

    // D-13: block if upload in progress
    if (uploadState.isUploading) {
      setErrorMessage(t('error.uploadInProgress'));
      return;
    }

    // D-06: trigger frontend form validation
    const form = document.getElementById('document-form') as HTMLFormElement;
    if (form && !form.checkValidity()) {
      form.requestSubmit();
      return;
    }

    // D-07: validate at least 1 APPROVE type approver
    const hasApprover = approvalLines.some((l) => l.lineType === 'APPROVE');
    if (!hasApprover) {
      setApprovalLineError(tApproval('approvalLine.approveRequired'));
      return;
    }

    // D-09: show confirm dialog
    setShowSubmitConfirm(true);
  }, [uploadState, t, tApproval, approvalLines]);

  const handleSubmitConfirm = useCallback(async () => {
    if (!savedDocId) return;

    try {
      // D-12: save unsaved changes before submit
      await saveNow();

      // D-30: persist approval lines to DB ONLY at submit time
      await updateMutation.mutateAsync({
        id: savedDocId,
        data: {
          title: formDataRef.current.title,
          bodyHtml: formDataRef.current.bodyHtml ?? null,
          formData: formDataRef.current.formData ?? null,
          approvalLines: toApprovalLineRequests(approvalLines),
        },
      });

      // D-05: call submit API
      const result = await submitMutation.mutateAsync(savedDocId);

      // D-17, D-18: redirect to detail page with success message
      navigate(`/documents/${savedDocId}`, {
        state: {
          submitSuccess: true,
          docNumber: result.docNumber,
        },
      });
    } catch (err: unknown) {
      setShowSubmitConfirm(false);
      // D-11, D-15: show error message
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 409) {
          setErrorMessage(t('error.alreadySubmitted'));
          return;
        }
      }
      setErrorMessage(t('error.submitFailed'));
    }
  }, [savedDocId, saveNow, updateMutation, approvalLines, submitMutation, navigate, t]);

  const templateEntry = TEMPLATE_REGISTRY[resolvedTemplateCode];
  const schemaSnapshot = existingDoc?.schemaDefinitionSnapshot ?? null;
  // Phase 24.1-04: CUSTOM fallback — 편집 모드는 스냅샷 존재로, 신규 작성은
  // 미등록 templateCode 로 판정. 하드코딩 6개 템플릿은 templateEntry 로 분기되어 영향 없음.
  const useCustomRenderer =
    !templateEntry &&
    (isEditMode
      ? !!schemaSnapshot
      : isCustomTemplate(resolvedTemplateCode));

  if (!templateEntry && !useCustomRenderer && !isEditMode) {
    return (
      <div className="text-center py-12 text-gray-500">
        알 수 없는 양식: {resolvedTemplateCode}
      </div>
    );
  }

  // While loading existing document
  if (isEditMode && !existingDoc) {
    return (
      <div className="max-w-4xl mx-auto space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  const EditComponent =
    templateEntry?.editComponent ?? (useCustomRenderer ? DYNAMIC_CUSTOM_EDIT : undefined);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate('/documents/my')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToList')}
      </button>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-4">
        <AutoSaveIndicator status={autoSaveStatus} />
        <div className="flex items-center gap-2">
          {savedDocId && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={submitMutation.isPending}
              className="inline-flex items-center gap-2 h-11 px-4 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium rounded-lg disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {t('delete')}
            </button>
          )}
          <button
            type="button"
            onClick={handleManualSave}
            disabled={submitMutation.isPending}
            className="inline-flex items-center gap-2 h-11 px-4 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {t('save')}
          </button>
          {savedDocId && (
            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={submitMutation.isPending}
              className="inline-flex items-center gap-2 h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={submitMutation.isPending ? t('submitConfirm.title') + '...' : undefined}
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t('submit')}
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Form container */}
      <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 ${submitMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
           aria-busy={submitMutation.isPending}>
        {EditComponent && (
          <EditComponent
            documentId={savedDocId}
            initialData={
              existingDoc
                ? {
                    title: existingDoc.title,
                    bodyHtml: existingDoc.bodyHtml ?? undefined,
                    formData: existingDoc.formData ?? undefined,
                    schemaSnapshot,
                  }
                : undefined
            }
            onSave={handleSave}
          />
        )}
      </div>

      {/* Attachments */}
      {savedDocId && (
        <div className="mt-6">
          <FileAttachmentArea
            documentId={savedDocId}
            documentStatus="DRAFT"
            readOnly={false}
            onUploadStateChange={setUploadState}
          />
        </div>
      )}

      {/* Approval Line Editor */}
      {savedDocId && (
        <div className="mt-8">
          <ApprovalLineEditor
            items={approvalLines}
            onChange={setApprovalLines}
            drafterId={currentUserId ?? 0}
            error={approvalLineError}
          />
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('deleteConfirm.title')}
        message={t('deleteConfirm.message')}
        confirmLabel={t('deleteConfirm.confirm')}
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Submit confirmation */}
      <ConfirmDialog
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleSubmitConfirm}
        title={t('submitConfirm.title')}
        message={t('submitConfirm.message')}
        confirmLabel={t('submitConfirm.confirm')}
        confirmVariant="primary"
        cancelLabel={t('submitConfirm.cancel')}
        isLoading={submitMutation.isPending}
      />
    </div>
  );
}
