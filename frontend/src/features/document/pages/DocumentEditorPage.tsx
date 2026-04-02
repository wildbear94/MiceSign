import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Trash2 } from 'lucide-react';
import AutoSaveIndicator from '../components/AutoSaveIndicator';
import ConfirmDialog from '../../admin/components/ConfirmDialog';
import ApprovalLineEditor from '../components/approval/ApprovalLineEditor';
import { TEMPLATE_REGISTRY } from '../components/templates/templateRegistry';
import {
  useDocumentDetail,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
} from '../hooks/useDocuments';
import { useAutoSave } from '../hooks/useAutoSave';
import type { ApprovalLineItem } from '../../approval/types/approval';

export default function DocumentEditorPage() {
  const { t } = useTranslation('document');
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approvalLines, setApprovalLines] = useState<ApprovalLineItem[]>([]);

  // For new docs, use templateCode from URL; for edits, from loaded document
  const { data: existingDoc } = useDocumentDetail(documentId);
  const resolvedTemplateCode = templateCode ?? existingDoc?.templateCode ?? '';

  const createMutation = useCreateDocument();
  const updateMutation = useUpdateDocument();
  const deleteMutation = useDeleteDocument();

  // Populate approval lines from existing document when editing
  useEffect(() => {
    if (existingDoc?.approvalLines && existingDoc.approvalLines.length > 0 && approvalLines.length === 0) {
      setApprovalLines(
        existingDoc.approvalLines.map((line) => ({
          userId: line.approver.id,
          userName: line.approver.name,
          departmentName: line.approver.departmentName,
          positionName: line.approver.positionName,
          lineType: line.lineType,
        })),
      );
    }
  }, [existingDoc]); // eslint-disable-line react-hooks/exhaustive-deps

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

      // Convert approval lines to request format
      const approvalLineRequests = approvalLines.length > 0
        ? approvalLines.map((item) => ({ approverId: item.userId, lineType: item.lineType }))
        : null;

      try {
        if (savedDocId) {
          // Update existing
          await updateMutation.mutateAsync({
            id: savedDocId,
            data: {
              title: data.title,
              bodyHtml: data.bodyHtml ?? null,
              formData: data.formData ?? null,
              approvalLines: approvalLineRequests,
            },
          });
        } else {
          // Create new
          const created = await createMutation.mutateAsync({
            templateCode: resolvedTemplateCode,
            title: data.title,
            bodyHtml: data.bodyHtml ?? null,
            formData: data.formData ?? null,
            approvalLines: approvalLineRequests,
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
    [savedDocId, resolvedTemplateCode, createMutation, updateMutation, approvalLines, t],
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

  const templateEntry = TEMPLATE_REGISTRY[resolvedTemplateCode];
  if (!templateEntry && !isEditMode) {
    return (
      <div className="text-center py-12 text-gray-500">
        Unknown template: {resolvedTemplateCode}
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

  const EditComponent = templateEntry?.editComponent;

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
          <button
            type="button"
            onClick={handleManualSave}
            className="inline-flex items-center gap-2 h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            {t('save')}
          </button>
          {savedDocId && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 h-11 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
              {t('delete')}
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        {EditComponent && (
          <EditComponent
            documentId={savedDocId}
            initialData={
              existingDoc
                ? {
                    title: existingDoc.title,
                    bodyHtml: existingDoc.bodyHtml ?? undefined,
                    formData: existingDoc.formData ?? undefined,
                  }
                : undefined
            }
            onSave={handleSave}
          />
        )}
      </div>

      {/* Approval line editor - only for DRAFT documents */}
      {(!existingDoc || existingDoc.status === 'DRAFT') && (
        <ApprovalLineEditor
          items={approvalLines}
          onItemsChange={setApprovalLines}
        />
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
    </div>
  );
}
