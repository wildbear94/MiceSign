import { useState, useCallback, useRef, useMemo, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Save, Send, Trash2, Loader2 } from 'lucide-react';
import AutoSaveIndicator from '../components/AutoSaveIndicator';
import SubmitConfirmDialog from '../components/SubmitConfirmDialog';
import ConfirmDialog from '../../admin/components/ConfirmDialog';
import ApprovalLineEditor from '../components/approval/ApprovalLineEditor';
import FileAttachmentArea from '../components/attachment/FileAttachmentArea';
import { TEMPLATE_REGISTRY, isHardcodedTemplate } from '../components/templates/templateRegistry';
import type { TemplateFormProps } from '../components/templates/templateRegistry';
import DynamicForm from '../components/templates/DynamicForm';
import {
  useDocument,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  useSubmitDocument,
} from '../hooks/useDocuments';
import { useTemplateByCode } from '../hooks/useTemplates';
import { useAutoSave } from '../hooks/useAutoSave';
import type {
  ApprovalLineRequest,
  UpdateDocumentRequest,
} from '../types/document';

export default function DocumentEditorPage() {
  const navigate = useNavigate();
  const { templateCode, id } = useParams<{
    templateCode?: string;
    id?: string;
  }>();

  const documentId = id ? Number(id) : null;
  const isEditMode = documentId !== null;

  // Saved document ID (null for brand-new, set after first save)
  const [savedDocId, setSavedDocId] = useState<number | null>(documentId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state refs for auto-save
  const titleRef = useRef('');
  const formDataRef = useRef<string | null>(null);
  const bodyHtmlRef = useRef<string | null>(null);
  const [title, setTitle] = useState('');
  const [approvalLines, setApprovalLines] = useState<ApprovalLineRequest[]>([]);

  // Load existing document (edit mode)
  const { data: existingDoc, isLoading: isLoadingDoc } = useDocument(documentId);

  // Resolve template code
  const resolvedTemplateCode = templateCode ?? existingDoc?.templateCode ?? '';

  // Load template schema for dynamic templates
  const { data: templateDetail } = useTemplateByCode(
    !isHardcodedTemplate(resolvedTemplateCode) ? resolvedTemplateCode : null,
  );

  // Mutations
  const createMutation = useCreateDocument();
  const updateMutation = useUpdateDocument();
  const deleteMutation = useDeleteDocument();
  const submitMutation = useSubmitDocument();

  // Initialize from existing doc
  const initializedRef = useRef(false);
  if (existingDoc && !initializedRef.current) {
    initializedRef.current = true;
    titleRef.current = existingDoc.title;
    formDataRef.current = existingDoc.formData;
    bodyHtmlRef.current = existingDoc.bodyHtml;
    // Only set state on first load
    if (!title) {
      setTitle(existingDoc.title);
    }
    if (existingDoc.approvalLines.length > 0 && approvalLines.length === 0) {
      setApprovalLines(
        existingDoc.approvalLines.map((line) => ({
          approverId: line.approverId,
          lineType: line.lineType,
          stepOrder: line.stepOrder,
        })),
      );
    }
  }

  // Build request data for save
  const getRequestData = useCallback((): UpdateDocumentRequest | null => {
    if (!titleRef.current) return null;
    return {
      title: titleRef.current,
      bodyHtml: bodyHtmlRef.current ?? undefined,
      formData: formDataRef.current ?? undefined,
      approvalLines: approvalLines.length > 0 ? approvalLines : undefined,
    };
  }, [approvalLines]);

  // Auto-save hook
  const { status: autoSaveStatus, saveNow } = useAutoSave(
    savedDocId,
    getRequestData,
    30000,
  );

  // Handle form data changes from template components
  const handleFormChange = useCallback(
    (data: { formData?: string; bodyHtml?: string }) => {
      if (data.formData !== undefined) formDataRef.current = data.formData;
      if (data.bodyHtml !== undefined) bodyHtmlRef.current = data.bodyHtml;
    },
    [],
  );

  // Handle title change
  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    titleRef.current = value;
  }, []);

  // Save draft
  const handleSave = useCallback(async () => {
    setErrorMessage(null);
    const currentTitle = titleRef.current || title;
    if (!currentTitle.trim()) {
      setErrorMessage('제목을 입력해주세요.');
      return;
    }

    try {
      if (savedDocId) {
        await updateMutation.mutateAsync({
          id: savedDocId,
          req: {
            title: currentTitle,
            bodyHtml: bodyHtmlRef.current ?? undefined,
            formData: formDataRef.current ?? undefined,
            approvalLines: approvalLines.length > 0 ? approvalLines : undefined,
          },
        });
      } else {
        const created = await createMutation.mutateAsync({
          templateCode: resolvedTemplateCode,
          title: currentTitle,
          bodyHtml: bodyHtmlRef.current ?? undefined,
          formData: formDataRef.current ?? undefined,
          approvalLines: approvalLines.length > 0 ? approvalLines : undefined,
        });
        setSavedDocId(created.id);
        window.history.replaceState(null, '', `/documents/${created.id}/edit`);
      }
    } catch {
      setErrorMessage('저장에 실패했습니다. 다시 시도해주세요.');
    }
  }, [savedDocId, title, resolvedTemplateCode, approvalLines, createMutation, updateMutation]);

  // Submit document
  const handleSubmit = useCallback(async () => {
    if (!savedDocId) {
      // Must save first
      await handleSave();
    }
    const docIdToSubmit = savedDocId;
    if (!docIdToSubmit) return;

    try {
      await submitMutation.mutateAsync(docIdToSubmit);
      navigate(`/documents/${docIdToSubmit}`);
    } catch {
      setErrorMessage('상신에 실패했습니다. 다시 시도해주세요.');
    }
  }, [savedDocId, handleSave, submitMutation, navigate]);

  // Delete draft
  const handleDelete = useCallback(async () => {
    if (!savedDocId) return;
    try {
      await deleteMutation.mutateAsync(savedDocId);
      navigate('/documents/my');
    } catch {
      setErrorMessage('삭제에 실패했습니다.');
    }
  }, [savedDocId, deleteMutation, navigate]);

  // Handle attachments change (trigger refetch)
  const handleAttachmentsChange = useCallback(() => {
    // Query invalidation is handled by the attachment hooks
  }, []);

  // Determine rendering mode
  const useHardcoded = isEditMode
    ? isHardcodedTemplate(resolvedTemplateCode) && !existingDoc?.schemaDefinitionSnapshot
    : isHardcodedTemplate(resolvedTemplateCode);

  const templateEntry = TEMPLATE_REGISTRY[resolvedTemplateCode];

  // Resolve schema definition for dynamic form
  const schemaDefinition = useMemo(() => {
    if (useHardcoded) return null;
    // For existing documents with snapshot, use snapshot
    if (existingDoc?.schemaDefinitionSnapshot) {
      return existingDoc.schemaDefinitionSnapshot;
    }
    // For new documents, use template's current schema
    if (templateDetail?.schemaDefinition) {
      return templateDetail.schemaDefinition;
    }
    return null;
  }, [useHardcoded, existingDoc, templateDetail]);

  // Loading state for existing document
  if (isEditMode && isLoadingDoc) {
    return (
      <div className="max-w-4xl mx-auto space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Unknown template
  if (!resolvedTemplateCode) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">알 수 없는 양식입니다.</p>
        <button
          type="button"
          onClick={() => navigate('/documents/my')}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const FormComponent = useHardcoded ? templateEntry?.form : null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate('/documents/my')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </button>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-4">
        <AutoSaveIndicator status={autoSaveStatus} />
        <div className="flex items-center gap-2">
          {savedDocId && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 h-10 px-4 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 h-10 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            저장
          </button>
          <button
            type="button"
            onClick={() => setShowSubmitConfirm(true)}
            disabled={!title.trim() || submitMutation.isPending}
            className="inline-flex items-center gap-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            상신
          </button>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Title input */}
      <div className="mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="문서 제목을 입력하세요"
          className="w-full h-12 px-4 text-lg font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Form container */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          }
        >
          {FormComponent ? (
            <FormComponent
              formData={formDataRef.current}
              bodyHtml={bodyHtmlRef.current}
              onChange={handleFormChange}
            />
          ) : schemaDefinition ? (
            <DynamicForm
              schemaDefinition={schemaDefinition}
              formData={formDataRef.current}
              onChange={(fd) => handleFormChange({ formData: fd })}
            />
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              양식을 불러오는 중입니다...
            </div>
          )}
        </Suspense>
      </div>

      {/* Approval line editor */}
      <div className="mb-6">
        <ApprovalLineEditor
          approvalLines={approvalLines}
          onChange={setApprovalLines}
        />
      </div>

      {/* File attachments */}
      {savedDocId && (
        <div className="mb-6">
          <FileAttachmentArea
            documentId={savedDocId}
            attachments={existingDoc?.attachments ?? []}
            editable
            onAttachmentsChange={handleAttachmentsChange}
          />
        </div>
      )}

      {/* Submit confirmation dialog */}
      <SubmitConfirmDialog
        isOpen={showSubmitConfirm}
        onConfirm={handleSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        title={title || '(제목 없음)'}
        approvalLineCount={approvalLines.length}
        isLoading={submitMutation.isPending}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="문서 삭제"
        message="임시저장된 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
